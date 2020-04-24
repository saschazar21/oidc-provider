import { comparePassword, hashPassword } from '~/lib/shared/util/password';

describe('Password', () => {
  let hashed: string;
  const plain = 'I am a password';

  it('hashes a plaintext password', async () => {
    hashed = await hashPassword(plain);

    expect(hashed).toBeDefined();
    expect(hashed.length).toBeGreaterThan(plain.length);
  });

  it('successfully compares a hashed with plaintext password', async () => {
    const match = await comparePassword(plain, hashed);

    expect(match).toBeTruthy();
  });

  it('returns false when comparing mismatching passwords', async () => {
    const match = await comparePassword('Not the actual password', hashed);

    expect(match).toBeFalsy();
  });
});
