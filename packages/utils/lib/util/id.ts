import { customAlphabet } from 'nanoid';
import { customAlphabet as customAlphabetAsync } from 'nanoid/async';

import { ALPHABET, ALPHABET_LENGTH } from 'config/lib/id';

export const id = (len = ALPHABET_LENGTH.DEFAULT): (() => string) =>
  customAlphabet(ALPHABET, len);

export const idAsync = (
  len = ALPHABET_LENGTH.DEFAULT
): (() => Promise<string>) => customAlphabetAsync(ALPHABET, len);

export default idAsync;
