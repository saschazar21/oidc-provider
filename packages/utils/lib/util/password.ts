import { compare, hash } from 'bcrypt';

import { SALT_ROUNDS } from 'config/lib/password';

export const hashPassword = (plain: string): Promise<string> =>
  hash(plain, SALT_ROUNDS);

export const comparePassword = (
  plain: string,
  hashed: string
): Promise<boolean> => compare(plain, hashed);

export default hashPassword;
