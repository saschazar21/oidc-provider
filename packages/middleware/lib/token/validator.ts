import { IncomingMessage, ServerResponse } from 'http';
import basic from 'basic-auth';
import { Document } from 'mongoose';

import connection, {
  AuthorizationCodeModel,
  ClientModel,
  disconnect,
  RefreshTokenModel,
} from 'database/lib';
import { BaseTokenSchema } from 'database/lib/schemata/token';
import bodyParser from 'middleware/lib/body-parser';
import { fetchToken } from 'middleware/lib/token/helpers';
import HTTPError from 'utils/lib/errors/http_error';
import TokenError from 'utils/lib/errors/token_error';
import { ERROR_CODE } from 'utils/lib/types/error_code';
import { GRANT_TYPE } from 'utils/lib/types/grant_type';
import { SCOPE } from 'utils/lib/types/scope';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import verifyCodeChallenge from 'utils/lib/util/verify-code-challenge';

type BaseTokenEndpointPayload = {
  grant_type: GRANT_TYPE;
  client_id?: string;
  client_secret?: string;
};

export type AuthorizationCodeTokenEndpointPayload = BaseTokenEndpointPayload & {
  code: string;
  redirect_uri: string;
  code_verifier?: string;
};

export type RefreshTokenEndpointPayload = BaseTokenEndpointPayload & {
  refresh_token: string;
  scope?: string;
};

export type IntrospectionRevocationRequestPayload = {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
  client_id?: string;
  client_secret?: string;
};

const compareScope = (scope: string, compare: SCOPE[]): SCOPE[] => {
  const split = scope.split(' ').filter((s: SCOPE) => s.length) as SCOPE[];
  if (!split.includes(SCOPE.OPENID)) {
    throw new TokenError(
      `scope must contain ${SCOPE.OPENID}`,
      ERROR_CODE.INVALID_SCOPE
    );
  }
  if (split.filter((s: SCOPE) => !compare.includes(s)).length) {
    throw new TokenError(
      'Refresh Token must not extend initially granted scopes',
      ERROR_CODE.INVALID_SCOPE
    );
  }
  return split;
};

const validateRefreshToken = async (
  payload: RefreshTokenEndpointPayload
): Promise<boolean> => {
  const { client_id, client_secret, refresh_token, scope } = payload;

  try {
    await connection();
    const refreshToken = await RefreshTokenModel.findById(
      refresh_token
    ).populate({
      path: 'authorization',
      populate: { path: 'client_id', select: 'client_secret scope' },
    });
    if (!refreshToken) {
      throw new TokenError(
        'Invalid or expired refresh token',
        ERROR_CODE.INVALID_GRANT
      );
    }
    const authorization = refreshToken.get('authorization');
    if (!authorization) {
      throw new TokenError(
        'Invalid or expired refresh token',
        ERROR_CODE.INVALID_GRANT
      );
    }
    const client = authorization.get('client_id');
    if (
      !client ||
      client.get('_id') !== client_id ||
      client.get('client_secret') !== client_secret
    ) {
      throw new TokenError(
        'Invalid client_id and/or client_secret',
        ERROR_CODE.INVALID_CLIENT
      );
    }

    const compare = scope && compareScope(scope, authorization.get('scope'));

    compare?.length &&
      compare?.length !== authorization.get('scope').length &&
      (await authorization.update({ scope: compare }));

    return true;
  } finally {
    await disconnect();
  }
};

const validateAuthorization = async (
  payload: AuthorizationCodeTokenEndpointPayload
): Promise<boolean> => {
  const { code, client_id, client_secret, code_verifier, redirect_uri } =
    payload;

  if (!code?.length) {
    throw new TokenError('Invalid or missing code', ERROR_CODE.INVALID_GRANT);
  }

  if (!redirect_uri?.length) {
    throw new TokenError(
      'Invalid or missing redirect_uri',
      ERROR_CODE.INVALID_GRANT
    );
  }

  try {
    await connection();
    const authorizationCode = await AuthorizationCodeModel.findById(
      code
    ).populate({
      path: 'authorization',
      populate: {
        path: 'client_id',
        select: '_id client_secret',
      },
    });
    const authorization = authorizationCode?.get('authorization');
    if (!authorizationCode || !authorization) {
      throw new TokenError('Invalid or expired code', ERROR_CODE.INVALID_GRANT);
    }
    if (!authorization.get('consent')) {
      throw new TokenError('Missing consent', ERROR_CODE.CONSENT_REQUIRED);
    }
    if (authorization.get('redirect_uri') !== redirect_uri) {
      throw new TokenError('Invalid redirect_uri', ERROR_CODE.INVALID_GRANT);
    }
    if (client_id !== authorization.get('client_id').get('_id')) {
      throw new TokenError('Invalid client_id', ERROR_CODE.INVALID_CLIENT);
    }
    if (!client_secret?.length && !code_verifier?.length) {
      throw new TokenError(
        'Missing client_secret or code_verifier',
        ERROR_CODE.INVALID_GRANT
      );
    }
    if (client_secret?.length && code_verifier?.length) {
      throw new TokenError(
        'Either client_secret or code_verifier allowed',
        ERROR_CODE.INVALID_REQUEST
      );
    }
    if (
      client_secret?.length &&
      client_secret !== authorization.get('client_id').get('client_secret')
    ) {
      throw new TokenError('Invalid client_secret', ERROR_CODE.INVALID_CLIENT);
    }
    try {
      if (
        code_verifier?.length &&
        !verifyCodeChallenge(
          authorization.get('code_challenge'),
          code_verifier,
          authorization.get('code_challenge_method')
        )
      ) {
        throw new TokenError(
          'Invalid code_verifier',
          ERROR_CODE.INVALID_CLIENT
        );
      }
    } catch (e) {
      throw e.name === TokenError.NAME
        ? e
        : new TokenError('Invalid code_verifier', ERROR_CODE.INVALID_CLIENT);
    }

    return true;
  } finally {
    await disconnect();
  }
};

const validateRequestPayload = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<
  AuthorizationCodeTokenEndpointPayload | RefreshTokenEndpointPayload
> => {
  const { name, pass } = basic(req) || {};
  const body = (await bodyParser(req, res, 'form')) as
    | AuthorizationCodeTokenEndpointPayload
    | RefreshTokenEndpointPayload;

  const client_id = name || body.client_id;
  const client_secret = pass || body.client_secret;

  if (!Object.values(GRANT_TYPE).includes(body.grant_type)) {
    throw new TokenError(
      `Invalid grant_type: ${body.grant_type}`,
      ERROR_CODE.UNSUPPORTED_GRANT_TYPE
    );
  }

  if (!client_id?.length) {
    throw new TokenError(
      'Invalid or missing client_id',
      ERROR_CODE.INVALID_CLIENT
    );
  }

  const payload = Object.assign(
    {},
    body,
    {
      client_id,
    },
    client_secret?.length ? { client_secret } : {}
  );

  body.grant_type === GRANT_TYPE.REFRESH_TOKEN
    ? await validateRefreshToken(payload as RefreshTokenEndpointPayload)
    : await validateAuthorization(
        payload as AuthorizationCodeTokenEndpointPayload
      );

  return payload;
};

export const validateClientSecret = async (
  client_id: string,
  client_secret: string
): Promise<boolean> => {
  try {
    await connection();
    const client = await ClientModel.findById(client_id, 'client_secret');
    return client.get('client_secret') === client_secret;
  } finally {
    await disconnect();
  }
};

export const validateIntrospectionRevocationRequestPayload = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<Document<BaseTokenSchema>> => {
  const { name, pass } = basic(req) || {};
  const {
    token,
    token_type_hint,
    client_id: clientId,
    client_secret: clientSecret,
  } = (await bodyParser(
    req,
    res,
    'form'
  )) as IntrospectionRevocationRequestPayload;

  const client_id = name || clientId;
  const client_secret = pass || clientSecret;

  if (!client_id || !client_secret) {
    throw new TokenError(
      'Missing client_id and or client_secret',
      ERROR_CODE.INVALID_CLIENT
    );
  }

  if (!(await validateClientSecret(client_id, client_secret))) {
    throw new TokenError(
      'Client authentication failed',
      ERROR_CODE.INVALID_CLIENT
    );
  }

  if (!token?.length) {
    throw new TokenError('Missing token', ERROR_CODE.INVALID_REQUEST);
  }

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

  const tokenDoc = await fetchToken(token);
  if (!tokenDoc) {
    return null;
  }
  const authorization = tokenDoc.get('authorization');
  if (!authorization) {
    throw new HTTPError(
      `${tokenDoc.get('type')} ${tokenDoc.get(
        '_id'
      )} contains missing authorization`,
      STATUS_CODE.SERVICE_UNAVAILABLE,
      req.method,
      req.url
    );
  }
  const client = await authorization.get('client');
  if (!client) {
    throw new HTTPError(
      `Authorization ID: ${authorization.get('_id')} contains missing client`,
      STATUS_CODE.SERVICE_UNAVAILABLE,
      req.method,
      req.url
    );
  }
  if (client.get('client_id') !== client_id) {
    throw new TokenError(
      'Client authentication failed',
      ERROR_CODE.INVALID_CLIENT
    );
  }

  return tokenDoc;
};

export default validateRequestPayload;
