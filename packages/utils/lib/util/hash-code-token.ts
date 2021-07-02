import crypto from 'crypto';

export const DEFAULT_HASH_ALGORITHM = 'sha256';

const hashCodeOrToken = (id: string, alg = DEFAULT_HASH_ALGORITHM): string => {
  try {
    const hash = crypto.createHash(alg).update(id).digest();
    return Buffer.from(hash.slice(0, Math.floor(hash.length * 0.5))).toString(
      'base64'
    );
  } catch (e) {
    console.error(e.message);
    throw new Error(`Hashing ${id} failed!`);
  }
};

export default hashCodeOrToken;
