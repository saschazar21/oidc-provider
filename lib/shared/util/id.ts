import { customAlphabet } from 'nanoid';
import { customAlphabet as customAlphabetAsync } from 'nanoid/async';

import { ALPHABET, ALPHABET_LENGTH } from '~/lib/shared/config/id';

export const id = (len: number = ALPHABET_LENGTH.DEFAULT) =>
  customAlphabet(ALPHABET, len);

export const idAsync = (len: number = ALPHABET_LENGTH.DEFAULT) =>
  customAlphabetAsync(ALPHABET, len);

export default idAsync;
