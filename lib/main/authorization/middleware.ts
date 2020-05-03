import { NextApiRequest, NextApiResponse } from 'next';
import query from 'querystring';
import { format, parse } from 'url';

import cookieParser from '~/lib/shared/middleware/cookies';
import redirect from '~/lib/shared/middleware/redirect';
import connect from '~/lib/shared/db';
import AuthorizationModel, {
  AuthorizationSchema,
} from '~/lib/shared/db/schemata/authorization';
import { METHOD } from '~/lib/shared/types/method';
import logError from '~/lib/shared/util/log_error';

// TODO: move to a general config space;
const MAX_AGE = 1000 * 60 * 5; // 5 minutes between login & authorization

export default async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<boolean> => {
  const cookies = await cookieParser(req, res);
  const authRequest: {
    email?: string;
    password?: string;
  } & AuthorizationSchema = req.method === METHOD.POST ? req.body : req.query;

  if (!cookies.get('authorization')) {
    try {
      const authorization = await connect().then(() =>
        AuthorizationModel.create(authRequest),
      );
      cookies.set('authorization', authorization.get('_id'), {
        expires: new Date(Date.now() + MAX_AGE),
        httpOnly: true,
        maxAge: MAX_AGE,
        sameSite: true,
        secure: true,
      });
    } catch (e) {
      const { method, url: path } = req;
      const { redirect_uri, state } = authRequest;
      const redirectUri = parse(redirect_uri, true);
      const responseQuery = Object.assign(
        {},
        { ...redirectUri.query },
        {
          // TODO: add types for error codes
          error: 'invalid_request',
        },
        state ? { state } : null,
      );
      const location = format({
        ...redirectUri,
        query: responseQuery,
      });
      await redirect(req, res, { location, status: 302 });

      logError({
        message: e.message || e,
        method,
        path,
        statusCode: 302,
      });
      return false;
    }
  }

  if (!cookies.get('user') && !(authRequest.email && authRequest.password)) {
    const status = req.method === METHOD.POST ? 303 : 307;
    const querystring = query.encode({
      redirect_to: '/api/authorization',
    });
    await redirect(req, res, { location: `/login?${querystring}`, status });
    return false;
  }

  return true;
};
