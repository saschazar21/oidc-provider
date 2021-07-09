import { IncomingMessage, ServerResponse } from 'http';
import type Cookies from 'cookies';
import { URL } from 'url';
import { encode } from 'querystring';
import { Document } from 'mongoose';

import getUrl from 'config/lib/url';
import {
  buildAuthorizationSchema,
  getAuthenticationFlow,
  mapAuthRequest,
  ResponsePayload,
} from 'middleware/lib/authorization/helper';
import cookieParser from 'middleware/lib/cookies';
import redirect from 'middleware/lib/redirect';
import AuthStrategy, {
  AuthorizationResponse,
} from 'middleware/strategies/AuthStrategy';
import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import { CLIENT_ENDPOINT, ENDPOINT } from 'utils/lib/types/endpoint';
import { ERROR_CODE } from 'utils/lib/types/error_code';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import HTTPError from 'utils/lib/errors/http_error';
import AuthorizationError from 'utils/lib/errors/authorization_error';

// TODO: move to a general config space;
const MAX_AGE = 1000 * 60 * 5; // 5 minutes between login & authorization
const IS_TEST = process.env.NODE_ENV === 'test';

const authorization = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<AuthorizationResponse<ResponsePayload> | void> => {
  let auth: AuthorizationSchema;
  let authenticationFlow: AuthStrategy<ResponsePayload>;
  let authorization: Document<AuthorizationSchema>;
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

  try {
    const authorizationId = cookies.get('authorization', { signed: !IS_TEST });
    const userId =
      cookies.get('user', { signed: !IS_TEST }) ||
      cookies.get('sub', { signed: !IS_TEST });
    const authRequest = await mapAuthRequest(req, res);

    auth = await buildAuthorizationSchema({
      ...authRequest,
      _id: authorizationId,
      user: userId,
    });
    authenticationFlow = getAuthenticationFlow(auth);
    authorization =
      (await authenticationFlow.init()) as Document<AuthorizationSchema>;
    if (!authorizationId) {
      cookies.set('authorization', authorization.get('_id'), {
        expires: new Date(Date.now() + MAX_AGE),
        httpOnly: true,
        maxAge: MAX_AGE,
        sameSite: true,
        secure: true,
      });
    }
  } catch (e) {
    let redirectUri: URL;
    const { redirect_uri = '', state } = auth || {};

    try {
      redirectUri = new URL(redirect_uri);
    } catch (err) {
      throw new HTTPError(
        e.message ?? err.message,
        STATUS_CODE.BAD_REQUEST,
        req.method,
        req.url
      );
    }

    const responseQuery = Object.assign(
      {},
      { ...redirectUri.searchParams },
      {
        error:
          e.name === AuthorizationError.NAME
            ? e.errorCode
            : ERROR_CODE.INVALID_REQUEST,
      },
      e.name === HTTPError.NAME ||
        e.name === AuthorizationError.NAME ||
        e.message?.startsWith('ERROR:')
        ? { error_description: e.message }
        : null,
      state ? { state } : null
    );
    redirectUri.search = encode(responseQuery);

    cookies.set('authorization');
    cookies.set('sub');
    return redirect(req, res, {
      location: redirectUri.toString(),
      statusCode: STATUS_CODE.FOUND,
    });
  }

  try {
    const response = await authenticationFlow.responsePayload();
    cookies.set('authorization');
    cookies.set('sub');
    return response;
  } catch (e) {
    let redirectUri: URL;
    const statusCode =
      req.method === METHOD.POST
        ? STATUS_CODE.SEE_OTHER
        : STATUS_CODE.TEMPORARY_REDIRECT;

    if (e.errorCode === ERROR_CODE.LOGIN_REQUIRED) {
      redirectUri = new URL(getUrl(CLIENT_ENDPOINT.LOGIN));
    }

    if (e.errorCode === ERROR_CODE.CONSENT_REQUIRED) {
      redirectUri = new URL(getUrl(CLIENT_ENDPOINT.CONSENT));
    }

    if (!redirectUri) {
      throw new HTTPError(
        e.message,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        req.method,
        req.url
      );
    }

    redirectUri.search = encode({
      redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
    });

    return redirect(req, res, {
      location: redirectUri.toString(),
      statusCode,
    });
  }
};

export default authorization;
