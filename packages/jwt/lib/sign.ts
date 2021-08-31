import { KeyLike, parseJwk } from 'jose/jwk/parse';
import { CompactSign } from 'jose/jws/compact/sign';
import { compactVerify } from 'jose/jws/compact/verify';

import { supportedAlgorithms } from '@saschazar/oidc-provider-config/lib/jwks';
import connection, {
  disconnect,
} from '@saschazar/oidc-provider-database/lib/connect';
import ClientModel from '@saschazar/oidc-provider-database/lib/schemata/client';
import { AddressSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';
import getKeys from '@saschazar/oidc-provider-utils/lib/keys';
import { CLAIM } from '@saschazar/oidc-provider-types/lib/claim';
import { JWS } from '@saschazar/oidc-provider-types/lib/jws';

import { JWTAuth, fillClaims } from './helpers';

const DEFAULT_ALGORITHM = 'RS256';

const fetchKey = async (alg: string, client_id?: string): Promise<KeyLike> => {
  if (!supportedAlgorithms('JWS').includes(alg)) {
    throw new Error(`${alg} not supported for signing JWT!`);
  }

  if (alg.startsWith('HS') && client_id?.length) {
    try {
      await connection();
      const client = await ClientModel.findById(client_id, 'client_secret');
      await disconnect();

      if (!client) {
        throw new Error(`Client with ID: ${client_id} not found!`);
      }

      return parseJwk({ alg, kty: 'oct', k: client.get('client_secret') }, alg);
    } catch (e) {
      throw new Error(`Client with ID: ${client_id} not found!`);
    }
  }

  const { keystore } = await getKeys();
  return keystore.get(alg as JWS);
};

export const verify = async (
  jws: string
): Promise<
  { [key in CLAIM]: string | number } & { address?: AddressSchema }
> => {
  try {
    const [protectedHeader, payload] = jws.split('.');
    const { aud } = JSON.parse(Buffer.from(payload, 'base64').toString());
    const { alg } = JSON.parse(
      Buffer.from(protectedHeader, 'base64').toString()
    );
    const key = await fetchKey(alg, aud);
    const { payload: claims } = await compactVerify(jws, key);
    return JSON.parse(Buffer.from(claims).toString());
  } catch (e) {
    console.error(e);
    throw new Error('Failed to verify JWS!');
  }
};

const sign = async (
  auth: JWTAuth,
  alg = DEFAULT_ALGORITHM
): Promise<string> => {
  try {
    const key = await fetchKey(alg, auth.client_id);

    const claims = await fillClaims(auth);
    return new CompactSign(Buffer.from(JSON.stringify(claims)))
      .setProtectedHeader({ alg, typ: 'JWT' })
      .sign(key);
  } catch (e) {
    console.error(e);
    throw new Error('Failed to sign JWT!');
  }
};

export default sign;
