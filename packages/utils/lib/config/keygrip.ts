import { nanoid } from 'nanoid/async';

export const KEYGRIP_LENGTH = 5;

const generate = async (): Promise<string[]> =>
  Promise.all(new Array(KEYGRIP_LENGTH).fill(null).map(() => nanoid()));

export default generate;
