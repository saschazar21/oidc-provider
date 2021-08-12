import connection, { AccessTokenModel, disconnect } from 'database/lib';
import { AddressSchema } from 'database/lib/schemata/user';
import TokenError from 'utils/lib/errors/token_error';
import { fetchUserData } from 'utils/lib/jwt/helpers';
import { ERROR_CODE } from 'utils/lib/types/error_code';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import { CLAIM } from 'utils/lib/types/claim';

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
      throw new TokenError(
        'Missing token',
        ERROR_CODE.INVALID_REQUEST,
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
