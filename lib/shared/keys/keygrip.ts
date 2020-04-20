import Keygrip from 'keygrip';

let keys: Keygrip;

const initialize = (k: string[]): void => {
  keys = new Keygrip(k);
};

const keygrip = (): Keygrip => {
  if (!keys) {
    // TODO: fill in key fetching functionality
    initialize(['test', 'demo']);
  }
  return keys;
};

export default keygrip;
