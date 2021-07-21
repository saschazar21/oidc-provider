import { IncomingMessage, ServerResponse } from 'http';
import basic from 'basic-auth';

import connection, { disconnect } from 'database/lib';
import {
  AccessTokenModel,
  RefreshTokenModel,
} from 'database/lib/schemata/token';
import bodyParser from 'middleware/lib/body-parser';
import TokenError from 'utils/lib/errors/token_error';
import { ERROR_CODE } from 'utils/lib/types/error_code';
import HTTPError from 'utils/lib/errors/http_error';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import { TOKEN_TYPE } from 'utils/lib/types/token_type';

export type RevocationRequestPayload = {
  token: string;
  token_type_hint?: 'access_token' | 'refresh_token';
  client_id?: string;
  client_secret?: string;
};

const revocationMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {
  const { name, pass } = basic(req) || {};
  const {
    token,
    token_type_hint,
    client_id: clientId,
    client_secret: clientSecret,
  } = (await bodyParser(req, res, 'form')) as RevocationRequestPayload;

  const client_id = name || clientId;
  const client_secret = pass || clientSecret;

  if (!client_id || !client_secret) {
    throw new TokenError(
      'Missing client_id and or client_secret',
      ERROR_CODE.INVALID_CLIENT
    );
  }

  if (!token) {
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

  try {
    await connection();

    const [accessToken, refreshToken] = await Promise.all([
      AccessTokenModel.findById(token),
      RefreshTokenModel.findById(token),
    ]);
    const tokenDoc = accessToken || refreshToken;

    if (!tokenDoc) {
      return true;
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
    const client = await authorization.getClient();
    if (!client) {
      throw new HTTPError(
        `Authorization ID: ${authorization.get('_id')} contains missing client`,
        STATUS_CODE.SERVICE_UNAVAILABLE,
        req.method,
        req.url
      );
    }
    if (
      client.get('client_id') !== client_id ||
      client.get('client_secret') !== client_secret
    ) {
      throw new TokenError(
        'Client authentication failed',
        ERROR_CODE.INVALID_CLIENT
      );
    }

    const accessTokenDoc =
      tokenDoc.get('type') === TOKEN_TYPE.REFRESH_TOKEN &&
      (await AccessTokenModel.findOne({
        authorization: authorization.get('_id'),
      }));

    await Promise.all([
      tokenDoc.delete(),
      accessTokenDoc && accessTokenDoc.delete(),
    ]);

    return true;
  } finally {
    await disconnect();
  }
};

export default revocationMiddleware;
