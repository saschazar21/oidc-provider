import connection, {
  AccessTokenModel,
  disconnect,
} from '@saschazar/oidc-provider-database/lib/';
import { AddressSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import AuthenticationError from '@saschazar/oidc-provider-utils/lib/errors/authentication_error';
import TokenError from '@saschazar/oidc-provider-utils/lib/errors/token_error';
import { fetchUserData } from '@saschazar/oidc-provider-jwt/lib/helpers';
import { ERROR_CODE } from '@saschazar/oidc-provider-types/lib/error_code';
import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';
import { CLAIM } from '@saschazar/oidc-provider-types/lib/claim';

export type UserInfoResponsePayload = Partial<
  { [key in CLAIM]: string | boolean | Date | AddressSchema }
>;

export const getClaims = async (
  token: string
): Promise<UserInfoResponsePayload> => {
  try {
    await connection();
    const tokenDoc = await AccessTokenModel.findById(token).populate(
      'authorization'
    );
    await disconnect();

    if (!tokenDoc || !tokenDoc.get('active')) {
      throw new AuthenticationError(
        'Invalid token submitted',
        ERROR_CODE.INVALID_TOKEN,
        'userinfo',
        STATUS_CODE.UNAUTHORIZED
      );
    }

    const authorizationDoc = tokenDoc.get('authorization');
    if (!authorizationDoc) {
      throw new TokenError(
        'Missing authorization',
        ERROR_CODE.INVALID_REQUEST,
        STATUS_CODE.BAD_REQUEST
      );
    }

    const claims = await fetchUserData(
      authorizationDoc.get('user'),
      authorizationDoc.get('scope')
    );

    return {
      ...claims,
      sub: authorizationDoc.get('user'),
    };
  } finally {
    disconnect();
  }
};
