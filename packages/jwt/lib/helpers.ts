import getUrl from '@saschazar/oidc-provider-config/lib/url';
import connection, {
  disconnect,
  UserModel,
} from '@saschazar/oidc-provider-database/lib/';
import { Authorization } from '@saschazar/oidc-provider-database/lib/schemata/authorization';
import {
  AddressSchema,
  UserSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/user';
import { CLAIM } from '@saschazar/oidc-provider-types/lib/claim';
import { SCOPE, SCOPE_CLAIMS } from '@saschazar/oidc-provider-types/lib/scope';
import { LIFETIME } from '@saschazar/oidc-provider-types/lib/lifetime';
import hashCodeOrToken from '@saschazar/oidc-provider-utils/lib/util/hash-code-token';

export type JWTAuth = Authorization & {
  updated_at: Date;
  user: string;
  client_id: string;
  access_token?: string;
  code?: string;
};

export type JWTPayload = {
  [key in CLAIM]: string | number;
} & {
  [CLAIM.ADDRESS]?: AddressSchema;
};

export const fetchUserData = async (
  id: string,
  scope: SCOPE[]
): Promise<Partial<UserSchema>> => {
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

    return fields.reduce(
      (doc: UserSchema, field: CLAIM): Partial<UserSchema> =>
        Object.assign(
          {},
          doc,
          typeof user.get(field) !== 'undefined'
            ? { [field]: user.get(field) }
            : null,
          field === 'updated_at'
            ? { [field]: Math.floor(user.get(field).valueOf() * 0.001) }
            : null
        ),
      {} as UserSchema
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
  const c_hash = auth.code && hashCodeOrToken(auth.code);

  return Object.assign(
    {},
    { ...userData },
    { ...fillOpenIDClaims(auth) },
    at_hash ? { at_hash } : null,
    c_hash ? { c_hash } : null,
    auth.nonce ? { nonce: auth.nonce } : null
  );
};
