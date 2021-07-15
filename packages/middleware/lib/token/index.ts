import { IncomingMessage, ServerResponse } from 'http';

import connection, {
  AccessTokenModel,
  disconnect,
  RefreshTokenModel,
} from 'database/lib';
import validateRequestPayload from 'middleware/lib/token/validator';
import HTTPError from 'utils/lib/errors/http_error';
import { STATUS_CODE } from 'utils/lib/types/status_code';

export type TokenResponsePayload = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
};

const tokenMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<TokenResponsePayload> => {
  const { code: authorization } = await validateRequestPayload(req, res);

  try {
    await connection();
    const [accessToken, refreshToken] = await Promise.all([
      AccessTokenModel.create({ authorization }),
      RefreshTokenModel.create({ authorization }),
    ]);

    const expires_in = Math.floor(
      (accessToken.get('expires_at').valueOf() - Date.now()) / 1000
    );

    return {
      access_token: accessToken.get('_id'),
      token_type: 'Bearer',
      expires_in,
      refresh_token: refreshToken.get('_id'),
    };
  } catch (e) {
    throw new HTTPError(
      e.message,
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      req.method,
      req.url
    );
  } finally {
    await disconnect();
  }
};

export default tokenMiddleware;
