import { IncomingMessage, ServerResponse } from 'http';
import { encode } from 'querystring';
import type Cookies from 'cookies';

import connect, {
  UserModel,
  AuthorizationModel,
  disconnect,
} from 'database/lib';
import bodyParser from 'middleware/lib/body-parser';
import cookieParser from 'middleware/lib/cookies';
import redirect from 'middleware/lib/redirect';
import AuthorizationError from 'utils/lib/errors/authorization_error';
import HTTPError from 'utils/lib/errors/http_error';
import { ERROR_CODE } from 'utils/lib/types/error_code';
import { STATUS_CODE } from 'utils/lib/types/status_code';

const IS_TEST = process.env.NODE_ENV === 'test';

export type ConsentForm = {
  consent: string;
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

  let err: HTTPError | AuthorizationError;
  err =
    !err && !authorizationId
      ? new HTTPError(
          `No authorization found using ID: ${authorizationId}!`,
          STATUS_CODE.BAD_REQUEST,
          req.method,
          req.url
        )
      : err;
  err =
    !err && !sub?.length
      ? new AuthorizationError(
          'User not authenticated!',
          ERROR_CODE.LOGIN_REQUIRED,
          null
        )
      : err;
  err =
    !err && consent !== 'true'
      ? new AuthorizationError(
          'Consent was denied by user!',
          ERROR_CODE.ACCESS_DENIED,
          null
        )
      : err;
  if (err?.name === HTTPError.NAME) {
    throw err;
  }

  try {
    await connect();
    const authorization = await AuthorizationModel.findById(authorizationId);
    if (!authorization || !authorization.get('client_id')) {
      throw new HTTPError(
        `No authorization found using ID: ${authorizationId}!`,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        req.method,
        req.url
      );
    }

    if (err) {
      const state = authorization.get('state');
      const responseQuery = Object.assign(
        {},
        {
          error: (err as AuthorizationError).errorCode,
          error_description: err.message,
        },
        state ? { state } : null
      );
      const location = new URL(authorization.get('redirect_uri'));
      location.search = `?${encode(responseQuery)}`;

      return redirect(req, res, {
        location: location.toString(),
        statusCode: STATUS_CODE.SEE_OTHER,
      });
    }

    const user = await UserModel.findByIdAndUpdate(sub, {
      $addToSet: { consents: authorization.get('client_id') },
    });

    if (!user) {
      throw new HTTPError(
        'Updating consent on user failed!',
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        req.method,
        req.url
      );
    }
  } finally {
    await disconnect();
  }

  // TODO: implement cookie-based redirect_to logic
  const location = redirect_to || '/';
  return redirect(req, res, { location, statusCode: STATUS_CODE.SEE_OTHER });
};

export default consent;
