import getUrl from 'config/lib/url';
import connection, { disconnect, UserModel } from 'database/lib';
import { Authorization } from 'database/lib/schemata/authorization';
import { AddressSchema, UserSchema } from 'database/lib/schemata/user';
import { CLAIM } from 'utils/lib/types/claim';
import { SCOPE, SCOPE_CLAIMS } from 'utils/lib/types/scope';
import { LIFETIME } from 'utils/lib/types/lifetime';
import hashCodeOrToken from 'utils/lib/util/hash-code-token';

export type JWTAuth = Authorization & {
  updated_at: Date;
  user: string;
  client_id: string;
  access_token?: string;
};

export type JWTPayload = {
  [key in CLAIM]: string | number;
} & {
  [CLAIM.ADDRESS]?: AddressSchema;
};

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
    const user = await UserModel.findById(id, fields.join(' '), {
      timestamps: true,
    });
    const { _id, id: theId, ...obj } = user.toJSON();
    return Object.assign(
      {},
      obj,
      obj.updated_at
        ? { updated_at: Math.floor(obj.updated_at.valueOf() * 0.001) }
        : null
    );
  } finally {
    await disconnect();
  }
};

const fillOpenIDClaims = (auth: JWTAuth): { [key in CLAIM]: string | number } =>
  ({
    [CLAIM.SUB]: auth.user,
    [CLAIM.ISS]: getUrl(),
    [CLAIM.AUD]: auth.client_id,
    [CLAIM.EXP]: Math.floor(Date.now() * 0.001) + LIFETIME.ACCESS_TOKEN,
    [CLAIM.IAT]: Math.floor(Date.now() * 0.001),
    [CLAIM.AUTH_TIME]: Math.floor(auth.updated_at.valueOf() * 0.001),
  } as { [key in CLAIM]: string | number });

export const fillClaims = async (auth: JWTAuth): Promise<JWTPayload> => {
  const userData = await fetchUserData(auth.user, auth.scope);
  const at_hash = auth.access_token && hashCodeOrToken(auth.access_token);
  const c_hash = auth._id && hashCodeOrToken(auth._id);

  return Object.assign(
    {},
    { ...userData },
    { ...fillOpenIDClaims(auth) },
    at_hash ? { at_hash } : null,
    c_hash ? { c_hash } : null,
    auth.nonce ? { nonce: auth.nonce } : null
  );
};
