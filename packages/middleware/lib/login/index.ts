import { IncomingMessage, ServerResponse } from 'http';
import type Cookies from 'cookies';

import connect, {
  disconnect,
  UserModel,
} from '@saschazar/oidc-provider-database/lib/';
import bodyParser from '@saschazar/oidc-provider-middleware/lib/body-parser';
import cookieParser from '@saschazar/oidc-provider-middleware/lib/cookies';
import redirect from '@saschazar/oidc-provider-middleware/lib/redirect';
import HTTPError from '@saschazar/oidc-provider-utils/lib/errors/http_error';
import { LoginForm } from '@saschazar/oidc-provider-types/lib/login';
import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';

const MAX_AGE = {
  sub: 1000 * 60 * 5, // 5 minutes, only for authorization, no session is persisted
  user: 1000 * 60 * 60 * 24 * 30, // 30 days, when session was selected
};

const login = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  let cookies: Cookies;
  try {
    cookies = await cookieParser(req, res);
  } catch (e) {
    throw new HTTPError(
      e.message,
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      req.method,
      req.url
    );
  }

  const { email, password, session, redirect_to } = (await bodyParser(
    req,
    res,
    'form'
  )) as LoginForm;

  const key = session ? 'user' : 'sub';
  cookies.set('sub');

  if (!email?.length || !password?.length) {
    res.setHeader(
      'WWW-Authenticate',
      'Digest realm="Authentication to OpenID Provider", charset="UTF-8"'
    );
    throw new HTTPError(
      'E-Mail and/or Password missing!',
      STATUS_CODE.UNAUTHORIZED,
      req.method,
      req.url
    );
  }

  const user = await connect().then(() => UserModel.findOne({ email }));
  await disconnect();
  if (!user || !(await user.comparePassword(password))) {
    res.setHeader(
      'WWW-Authenticate',
      'Digest realm="Authentication to OpenID Provider", charset="UTF-8"'
    );
    throw new HTTPError(
      `User not found or passwords don't match!`,
      STATUS_CODE.UNAUTHORIZED,
      req.method,
      req.url
    );
  }

  cookies.set(key, user._id, {
    expires: new Date(Date.now() + MAX_AGE[key]),
    httpOnly: true,
    maxAge: MAX_AGE[key],
    sameSite: true,
    secure: true,
  });

  // TODO: implement cookie-based redirect logic
  const location = redirect_to || '/';
  return redirect(req, res, { location, statusCode: STATUS_CODE.SEE_OTHER });
};

export default login;
