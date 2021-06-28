import { IncomingMessage, ServerResponse } from 'http';
import type Cookies from 'cookies';
import { URL } from 'url';
import { encode } from 'querystring';

import getUrl from 'config/lib/url';
import { mapAuthRequest } from 'middleware/lib/authorization/helper';
import {
  validateResponseType,
  validateScope,
} from 'middleware/lib/authorization/validator';
import cookieParser from 'middleware/lib/cookies';
import redirect from 'middleware/lib/redirect';
import connect, { disconnect } from 'database/lib';
import AuthorizationModel, {
  AuthorizationSchema,
} from 'database/lib/schemata/authorization';
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
): Promise<AuthorizationSchema | void> => {
  let authorization;
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
  const authRequest = await mapAuthRequest(req, res);

  await connect();
  try {
    if (!authorizationId) {
      await Promise.all([
        validateResponseType(authRequest),
        validateScope(authRequest),
      ]);
      authorization = await AuthorizationModel.create(authRequest);

      const authorizationId = authorization.get('_id');
      cookies.set('authorization', authorizationId, {
        expires: new Date(Date.now() + MAX_AGE),
        httpOnly: true,
        maxAge: MAX_AGE,
        sameSite: true,
        secure: true,
      });
    } else {
      authorization = await AuthorizationModel.findById(authorizationId);
      if (!authorization) {
        throw new Error(`Authorization ID ${authorizationId} not found!`);
      }
    }
  } catch (e) {
    const { redirect_uri = '', state } = authRequest;
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
  } finally {
    await disconnect();
  }

  if (
    !cookies.get('user', { signed: !IS_TEST }) &&
    !cookies.get('sub', { signed: !IS_TEST })
  ) {
    const statusCode =
      req.method === METHOD.POST
        ? STATUS_CODE.SEE_OTHER
        : STATUS_CODE.TEMPORARY_REDIRECT;
    const redirectUri = new URL(getUrl(CLIENT_ENDPOINT.LOGIN));
    redirectUri.search = encode({
      redirect_to: getUrl(ENDPOINT.AUTHORIZATION),
    });

    return redirect(req, res, {
      location: redirectUri.toString(),
      statusCode,
    });
  }

  cookies.set('authorization');
  cookies.set('sub');
  return authorization.toJSON();
};

export default authorization;
