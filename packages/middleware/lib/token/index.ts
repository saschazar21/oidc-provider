import { Document } from 'mongoose';
import { IncomingMessage, ServerResponse } from 'http';

import connection, {
  AccessTokenModel,
  AuthorizationCodeModel,
  disconnect,
  RefreshTokenModel,
} from '@saschazar/oidc-provider-database/lib/';
import { AuthorizationSchema } from '@saschazar/oidc-provider-database/lib/schemata/authorization';
import validateRequestPayload, {
  AuthorizationCodeTokenEndpointPayload,
  RefreshTokenEndpointPayload,
} from '@saschazar/oidc-provider-middleware/lib/token/validator';
import HTTPError from '@saschazar/oidc-provider-utils/lib/errors/http_error';
import sign from '@saschazar/oidc-provider-jwt/lib/sign';
import { LIFETIME } from '@saschazar/oidc-provider-types/lib/lifetime';
import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';

export type TokenResponsePayload = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  id_token?: string;
};

const tokenMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<TokenResponsePayload> => {
  let authorization: Document<AuthorizationSchema>;

  const { code, refresh_token } = (await validateRequestPayload(
    req,
    res
  )) as AuthorizationCodeTokenEndpointPayload & RefreshTokenEndpointPayload;

  try {
    await connection();
    if (code) {
      const authorizationCode = await AuthorizationCodeModel.findByIdAndDelete(
        code
      ).populate({ path: 'authorization' });
      authorization = authorizationCode.get('authorization');
    }
    if (refresh_token) {
      const refreshToken = await RefreshTokenModel.findByIdAndDelete(
        refresh_token
      ).populate({ path: 'authorization' });
      authorization = refreshToken.get('authorization');
      await AccessTokenModel.findOneAndDelete({
        authorization: authorization.get('_id'),
      });
    }

    const [accessToken, refreshToken] = await Promise.all([
      AccessTokenModel.create({
        authorization: authorization.get('_id'),
      }),
      RefreshTokenModel.create({
        authorization: authorization.get('_id'),
      }),
      authorization.update({
        expires_at: new Date(Date.now() + LIFETIME.REFRESH_TOKEN * 1000),
      }),
    ]);

    const id_token = await sign({
      ...(authorization.toObject() as unknown as AuthorizationSchema & {
        updated_at: Date;
        user: string;
      }),
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
  } finally {
    await disconnect();
  }
};

export default tokenMiddleware;
