import { IncomingMessage, ServerResponse } from 'http';
import basic from 'basic-auth';

import bodyParser from 'middleware/lib/body-parser';
import HTTPError from 'utils/lib/errors/http_error';
import TokenError from 'utils/lib/errors/token_error';
import { ERROR_CODE } from 'utils/lib/types/error_code';
import { STATUS_CODE } from 'utils/lib/types/status_code';

const BEARER_REGEX = /^bearer\s/i;

export type IntrospectionRequestPayload = {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
  client_id?: string;
  client_secret?: string;
};

export type IntrospectionResponsePayload = {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: 'Bearer';
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  jti?: string;
};

const introspectionMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<IntrospectionResponsePayload> => {
  const { authorization } = req.headers;
  const { name, pass } = basic(req) || {};
  const {
    token,
    token_type_hint,
    client_id: clientId,
    client_secret: clientSecret,
  } = (await bodyParser(req, res, 'form')) as IntrospectionRequestPayload;

  const client_id = name || clientId;
  const client_secret = pass || clientSecret;
  const bearer =
    BEARER_REGEX.test(authorization) &&
    authorization.replace(BEARER_REGEX, '').trim();

  if (!(client_id && client_secret) || !bearer) {
    throw new HTTPError(
      'No client or bearer credentials given',
      STATUS_CODE.UNAUTHORIZED,
      req.method,
      req.url
    );
  }

  // TODO: abstract in helpers
  if (!token?.length) {
    throw new TokenError('Missing token', ERROR_CODE.INVALID_REQUEST);
  }

  // TODO: abstract in helpers
  if (
    token_type_hint &&
    token_type_hint !== 'access_token' &&
    token_type_hint !== 'refresh_token'
  ) {
    throw new TokenError(
      'Invalid token_type_hint',
      ERROR_CODE.UNSUPPORTED_TOKEN_TYPE
    );
  }

  // TODO: add token validation and lookup functionality

  return {
    active: false,
  };
};

export default introspectionMiddleware;
