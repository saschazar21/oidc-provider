import { createHash } from 'crypto';

const CODE_CHALLENGE_LENGTH = 43;
const CODE_VERIFIER_REGEX = /^[a-z0-9\-._~]{43,128}$/i;

export const CODE_VERIFIER_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';

export const verifyCodeChallenge = (
  code_challenge = '',
  code_verifier?: string,
  code_challenge_method: 'plain' | 'S256' = 'plain'
): boolean => {
  if (code_challenge.length !== CODE_CHALLENGE_LENGTH) {
    throw new Error(
      `ERROR: code_challenge must consist of exactly ${CODE_CHALLENGE_LENGTH} characters!`
    );
  }
  if (code_verifier && !CODE_VERIFIER_REGEX.test(code_verifier)) {
    throw new Error(
      `ERROR: code_verifier must only consist of the following characters: [a-z][A-Z][0-9]-._~`
    );
  }
  if (code_verifier && code_challenge_method === 'S256') {
    const hashed = createHash('sha256')
      .update(code_verifier)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    return hashed === code_challenge;
  }
  return code_verifier ? code_verifier === code_challenge : true;
};

export default verifyCodeChallenge;
