import getUrl from 'config/lib/url';
import connection, { disconnect, UserModel } from 'database/lib';
import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import { AddressSchema, UserSchema } from 'database/lib/schemata/user';
import { CLAIM } from 'utils/lib/types/claim';
import { SCOPE, SCOPE_CLAIMS } from 'utils/lib/types/scope';
import { LIFETIME } from '../types/lifetime';

const fetchUserData = async (
  id: string,
  scope: SCOPE[]
): Promise<UserSchema> => {
  const fields = scope.reduce(
    (claims: CLAIM[], current: SCOPE): CLAIM[] =>
      current === SCOPE.OPENID
        ? claims
        : ([...claims, ...SCOPE_CLAIMS[current]] as CLAIM[]),
    [] as CLAIM[]
  );

  if (!fields.length) {
    return {} as UserSchema;
  }

  try {
    await connection();
    const user = await UserModel.findById(id, fields.join(' '));
    const { _id, id: theId, ...obj } = user.toJSON();
    return obj;
  } finally {
    await disconnect();
  }
};

const fillOpenIDClaims = (
  auth: AuthorizationSchema
): { [key in CLAIM]: string | number } =>
  ({
    [CLAIM.SUB]: auth.user,
    [CLAIM.ISS]: getUrl(),
    [CLAIM.AUD]: auth.client_id,
    [CLAIM.EXP]: Math.floor(Date.now() * 0.001) + LIFETIME.ACCESS_TOKEN,
    [CLAIM.IAT]: Math.floor(Date.now() * 0.001),
    [CLAIM.AUTH_TIME]: Math.floor(auth.updatedAt.valueOf() * 0.001),
  } as { [key in CLAIM]: string | number });

export const fillClaims = async (
  auth: AuthorizationSchema
): Promise<{ [key in CLAIM]: string | number | AddressSchema }> => {
  const userData = await fetchUserData(auth.user, auth.scope);

  return Object.assign(
    {},
    { ...userData },
    { ...fillOpenIDClaims(auth) },
    auth.nonce ? { nonce: auth.nonce } : null
  );
};
