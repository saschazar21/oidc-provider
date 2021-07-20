import { Document } from 'mongoose';
import Keygrip from 'keygrip';

import connect, { disconnect, KeyModel } from 'database/lib';
import { KeySchema } from 'database/lib/schemata/key';
import getKeystore from 'utils/lib/keys/jwks';
import createCookieSecrets from 'config/lib/keygrip';
import getKeygrip from 'utils/lib/keys/keygrip';
import { decrypt, encrypt } from 'utils/lib/util/aes';
import { JWK } from 'jose/webcrypto/types';
import KeyStore from 'utils/lib/util/keystore';

export interface KeyObject {
  cookies: string[];
  keys: KeyStore;
}

export interface KeyStructure {
  keygrip: Keygrip;
  keystore: KeyStore;
}

let keys: KeyStructure;

const createKeys = async (
  cookieSecrets: string[],
  keys?: JWK[]
): Promise<KeyStructure> => ({
  keygrip: await getKeygrip(cookieSecrets),
  keystore: await getKeystore(Array.isArray(keys) && { keys }),
});

const fetchKeys = async (): Promise<Document<KeySchema>> => {
  await connect();
  const keys = await KeyModel.findById('master', 'bin');
  return disconnect().then(() => keys);
};

const saveKeys = async (bin: Buffer): Promise<Document<KeySchema>> => {
  await connect();
  const key = await KeyModel.create({
    _id: 'master',
    bin,
  });
  return disconnect().then(() => key);
};

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
    keys = await createKeys(cookies, jwks);
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
        ...keys.keystore.export(true),
        cookies: cookieSecrets,
      })
    )) as Buffer;

    await saveKeys(encrypted);
    return keys;
  }
};

export default getKeys;
