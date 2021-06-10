import { IncomingMessage, ServerResponse } from 'http';
import type Cookies from 'cookies';

import connect, {
  UserModel,
  AuthorizationModel,
  disconnect,
} from 'database/lib';
import bodyParser from 'middleware/lib/body-parser';
import cookieParser from 'middleware/lib/cookies';
import redirect from 'middleware/lib/redirect';
import HTTPError from 'utils/lib/util/http_error';
import { STATUS_CODE } from 'utils/lib/types/status_code';

const IS_TEST = process.env.NODE_ENV === 'test';

export type ConsentForm = {
  consent: boolean;
  redirect_to?: string;
};

const consent = async (
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

  const { consent, redirect_to } = (await bodyParser(
    req,
    res,
    'form'
  )) as ConsentForm;

  const authorizationId = cookies.get('authorization', { signed: !IS_TEST });
  const sub =
    cookies.get('user', { signed: !IS_TEST }) ||
    cookies.get('sub', { signed: !IS_TEST });

  let err = '';
  err = !err.length && !sub?.length ? 'User not logged in!' : err;
  err = !err.length && !authorizationId ? 'No authorization found!' : err;
  err = !err.length && !consent ? 'No consent was given!' : err;
  if (err.length > 0) {
    throw new HTTPError(err, STATUS_CODE.BAD_REQUEST, req.method, req.url);
  }

  await connect()
    .then(() =>
      AuthorizationModel.findByIdAndUpdate(
        authorizationId,
        { $set: { consent: true } },
        { new: true, fields: 'client_id' }
      )
    )
    .then((authorization) => {
      if (!authorization || !authorization.get('client_id')) {
        throw new HTTPError(
          'Updating consent on authorization failed!',
          STATUS_CODE.INTERNAL_SERVER_ERROR,
          req.method,
          req.url
        );
      }
      return UserModel.findByIdAndUpdate(sub, {
        $addToSet: { consents: authorization.get('client_id') },
      });
    })
    .then(() => disconnect());

  // TODO: implement cookie-based redirect_to logic
  const location = redirect_to || '/';
  return redirect(req, res, { location, statusCode: STATUS_CODE.SEE_OTHER });
};

export default consent;
