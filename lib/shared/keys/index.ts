import { JWKS, JSONWebKeySet } from 'jose';
import Keygrip from 'keygrip';

import connect, { KeyModel } from '~/lib/shared/db';
import getKeystore from '~/lib/shared/keys/jwks';
import createCookieSecrets from '~/lib/shared/config/keygrip';
import getKeygrip from '~/lib/shared/keys/keygrip';
import { decrypt, encrypt } from '~/lib/shared/util/aes';

export interface KeyObject {
  cookies: string[];
  keys: JSONWebKeySet;
}

export interface KeyStructure {
  keygrip: Keygrip;
  keystore: JWKS.KeyStore;
}

let keys: KeyStructure;

export const clearKeys = (): void => {
  keys = undefined;
};

const createKeys = async (
  cookieSecrets: string[],
  jwks?: JSONWebKeySet
): Promise<KeyStructure> => ({
  keygrip: await getKeygrip(cookieSecrets),
  keystore: await getKeystore(jwks),
});

const fetchKeys = async () =>
  connect().then(() => KeyModel.findById('master', 'bin'));

const saveKeys = async (bin: Buffer) =>
  connect().then(async () =>
    KeyModel.create({
      _id: 'master',
      bin,
    })
  );

const getKeys = async (
  masterkey: string = process.env.MASTER_KEY
): Promise<KeyStructure> => {
  if (keys) {
    return keys;
  }

  if (!masterkey) {
    throw new Error('ERROR: Masterkey is missing!');
  }

  try {
    const retrieved = await fetchKeys();
    if (!retrieved || !retrieved.get('bin')) {
      throw new Error('NOT_FOUND');
    }
    const { cookies, keys: jwks } = JSON.parse(
      await decrypt(masterkey, retrieved.get('bin'))
    );
    keys = await createKeys(cookies, { keys: jwks });
    return keys;
  } catch (e) {
    if (e.message !== 'NOT_FOUND') {
      throw e;
    }

    const cookieSecrets = await createCookieSecrets();
    keys = await createKeys(cookieSecrets);

    const encrypted = (await encrypt(
      masterkey,
      JSON.stringify({
        ...keys.keystore.toJWKS(true),
        cookies: cookieSecrets,
      })
    )) as Buffer;

    await saveKeys(encrypted);
    return keys;
  }
};

export default getKeys;
