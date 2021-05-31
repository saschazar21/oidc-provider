import Keygrip from 'keygrip';

import createKeys from 'utils/lib/config/keygrip';

let keys: Keygrip;

const initialize = (k: string[]): void => {
  keys = new Keygrip(k);
};

const keygrip = async (restoredKeys?: string[]): Promise<Keygrip> => {
  if (!keys || restoredKeys) {
    initialize(restoredKeys || (await createKeys()));
  }
  return keys;
};

export default keygrip;
