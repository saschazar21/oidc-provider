import { createHash } from 'crypto';
import { customAlphabet } from 'nanoid';

import {
  CODE_VERIFIER_ALPHABET,
  verifyCodeChallenge,
} from 'utils/lib/util/verify-code-challenge';

describe('Validate Code Challenge', () => {
  // https://datatracker.ietf.org/doc/html/rfc7636#appendix-B
  const fixture_verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  const fixture_challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

  const codeVerifierFactory = (len: number): (() => string) =>
    customAlphabet(CODE_VERIFIER_ALPHABET, len);
  const createCodeChallenge = (verifier: string): string =>
    createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  it('verifies code_challenge', () => {
    expect(verifyCodeChallenge(fixture_challenge)).toEqual(true);
  });

  it('verifies code_verifier with code_challenge', () => {
    expect(
      verifyCodeChallenge(fixture_challenge, fixture_verifier, 'S256')
    ).toEqual(true);
  });

  it('verifies custom code_verifier', () => {
    const verifier = codeVerifierFactory(128)();
    const challenge = createCodeChallenge(verifier);

    expect(verifyCodeChallenge(challenge, verifier, 'S256')).toEqual(true);
  });

  it('throws when length of code_challenge is too short', () => {
    expect(() =>
      verifyCodeChallenge(fixture_challenge.substr(0, -1))
    ).toThrowError();
  });

  it('throws when length of code_challenge is too long', () => {
    expect(() =>
      verifyCodeChallenge(
        [fixture_challenge, fixture_challenge, fixture_challenge].join('')
      )
    ).toThrowError();
  });

  it('throws when code_verifier is in wrong format', () => {
    expect(() =>
      verifyCodeChallenge(fixture_challenge, `${fixture_verifier}+`)
    ).toThrowError();
  });

  it('returns false, when code_challenge could not be verified using S256', () => {
    expect(
      verifyCodeChallenge(fixture_challenge, `${fixture_verifier}asdf`, 'S256')
    ).toEqual(false);
  });

  it('returns false, when code_challenge could not be verified using plain', () => {
    expect(
      verifyCodeChallenge(fixture_verifier, `${fixture_verifier}asdf`)
    ).toEqual(false);
  });
});
