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
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import HTTPError from 'utils/lib/util/http_error';

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

  const authorizationId = cookies.get('authorization', { signed: !IS_TEST });
  const userId =
    cookies.get('user', { signed: !IS_TEST }) ||
    cookies.get('sub', { signed: !IS_TEST });
  const authRequest = await mapAuthRequest(req, res);

  try {
    auth = await buildAuthorizationSchema({
      ...authRequest,
      _id: authorizationId,
      user: userId,
    });
  } catch (e) {
    throw new HTTPError(
      e.message,
      STATUS_CODE.BAD_REQUEST,
      req.method,
      req.url
    );
  }

  try {
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
    console.error(e);
    const { redirect_uri = '', state } = auth;
    const redirectUri = new URL(redirect_uri);
    const responseQuery = Object.assign(
      {},
      { ...redirectUri.searchParams },
      {
        // TODO: add types for error codes
        error: 'invalid_request',
      },
      e.name === HTTPError.NAME ? { error_description: e.message } : null,
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

    if (!authorization.get('user')) {
      redirectUri = redirectUri ?? new URL(getUrl(CLIENT_ENDPOINT.LOGIN));
    }

    if (!authorization.get('consent')) {
      redirectUri = redirectUri ?? new URL(getUrl(CLIENT_ENDPOINT.CONSENT));
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
