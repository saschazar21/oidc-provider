import { IncomingMessage, ServerResponse } from 'http';

import connection, {
  AccessTokenModel,
  AuthorizationCodeModel,
  disconnect,
  RefreshTokenModel,
} from 'database/lib';
import validateRequestPayload from 'middleware/lib/token/validator';
import HTTPError from 'utils/lib/errors/http_error';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import sign from 'utils/lib/jwt/sign';

export type TokenResponsePayload = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  id_token: string;
};

const tokenMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<TokenResponsePayload> => {
  const { code } = await validateRequestPayload(req, res);

  try {
    await connection();
    const authorizationCode = await AuthorizationCodeModel.findByIdAndDelete(
      code
    ).populate({
      path: 'authorization',
    });
    const authorization = authorizationCode.get('authorization');

    const [accessToken, refreshToken] = await Promise.all([
      AccessTokenModel.create({
        authorization: authorization.get('_id'),
      }),
      RefreshTokenModel.create({
        authorization: authorization.get('_id'),
      }),
    ]);

    const id_token = await sign({
      ...authorization.toJSON(),
      access_token: accessToken.get('_id'),
    });

    const expires_in = Math.floor(
      (accessToken.get('expires_at').valueOf() - Date.now()) / 1000
    );

    return {
      access_token: accessToken.get('_id'),
      token_type: 'Bearer',
      expires_in,
      refresh_token: refreshToken.get('_id'),
      id_token,
    };
  } catch (e) {
    throw new HTTPError(
      e.message,
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      req.method,
      req.url
    );

    // const headers = Object.assign(
    //   {},
    //   { 'Content-Type': 'application/json' },
    //   e.statusCode === STATUS_CODE.UNAUTHORIZED
    //     ? { 'WWW-Authenticate': 'Basic realm="Access to token endpoint"' }
    //     : {}
    // );
    // res.writeHead(e.statusCode, headers);
    // return res.write(JSON.stringify({
    //   error: e.errorCode,
    //   error_description: e.message,
    // }));
  } finally {
    await disconnect();
  }
};

export default tokenMiddleware;
