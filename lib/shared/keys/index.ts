import { JSONWebKey } from 'jose';

import connect, { KeyModel } from '~/lib/shared/db';
import getKeyStore from '~/lib/shared/keys/jwks';
import createkeys from '~/lib/shared/config/keygrip';
import getKeygrip from '~/lib/shared/keys/keygrip';
import { decrypt, encrypt } from '~/lib/shared/util/aes';

export interface KeyStructure {
  cookies: string[];
  keys: JSONWebKey[];
}

let keys: KeyStructure;

const createKeys = async () => ({
  ...(await getKeyStore()).toJWKS(true),
  cookies: await createkeys(),
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
    console.log(masterkey, retrieved.get('bin'));
    keys = JSON.parse(await decrypt(masterkey, retrieved.get('bin')));
    await Promise.all([
      getKeyStore({ keys: keys.keys }),
      getKeygrip(keys.cookies),
    ]);
    return keys;
  } catch (e) {
    if (e.message !== 'NOT_FOUND') {
      throw e;
    }

    keys = await createKeys();

    const [encrypted] = await Promise.all([
      encrypt(masterkey, JSON.stringify(keys)) as Promise<Buffer>,
      getKeyStore({ keys: keys.keys }),
      getKeygrip(keys.cookies),
    ]);
    await saveKeys(encrypted);
    return keys;
  }
};

export default getKeys;
