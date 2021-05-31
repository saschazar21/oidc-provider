import { createCipheriv, createDecipheriv, pbkdf2, randomBytes } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

export const ALGORITHM = 'aes-256-gcm';
export const DIGEST = 'sha512';
export const IV_SIZE = 16;
export const KEY_LENGTH = 32;
export const SALT_SIZE = 64;
export const TAG_SIZE = 16;

const ITERATIONS = 2 ** 16;

export const decrypt = async (
  masterkey: string,
  data: BufferSource
): Promise<string> => {
  let idx = 0;
  const decodedKey = Buffer.from(masterkey, 'base64');
  const encrypted = data as Buffer;

  const salt = encrypted.slice(idx, (idx += SALT_SIZE));
  const iv = encrypted.slice(idx, (idx += IV_SIZE));
  const tag = encrypted.slice(idx, (idx += TAG_SIZE));
  const text = encrypted.slice(idx);

  const key = await pbkdf2Async(
    decodedKey,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST
  );
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted =
    decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');

  return decrypted;
};

export const encrypt = async (
  masterkey: string,
  data: string
): Promise<BufferSource> => {
  const decodedKey = Buffer.from(masterkey, 'base64');
  const iv = randomBytes(IV_SIZE);
  const salt = randomBytes(SALT_SIZE);

  const key = await pbkdf2Async(
    decodedKey,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST
  );
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]);
};
