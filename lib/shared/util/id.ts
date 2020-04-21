import { customAlphabet } from 'nanoid';
import { customAlphabet as customAlphabetAsync } from 'nanoid/async';

import { ALPHABET, ALPHABET_LENGTH } from '~/lib/shared/config/id';

export const id = customAlphabet(ALPHABET, ALPHABET_LENGTH.DEFAULT);

export const idAsync = customAlphabetAsync(ALPHABET, ALPHABET_LENGTH.DEFAULT);

export default idAsync;
