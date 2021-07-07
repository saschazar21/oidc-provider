import { createHash } from 'crypto';

const MIN_LENGTH = 43;
const MAX_LENGTH = 128;

const CODE_VERIFIER_REGEX = /^[a-z0-9\-._~]{43,128}$/i;

export const verifyCodeChallenge = (
  code_challenge: string,
  code_verifier?: string,
  code_challenge_method: 'plain' | 'S256' = 'plain'
): boolean => {
  if (
    code_challenge.length < MIN_LENGTH ||
    code_challenge.length > MAX_LENGTH
  ) {
    throw new Error(
      `ERROR: code_challenge must consist between ${MIN_LENGTH} and ${MAX_LENGTH} characters!`
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
