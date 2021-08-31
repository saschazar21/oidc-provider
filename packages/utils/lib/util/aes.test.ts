import { randomBytes } from 'crypto';

import { decrypt, encrypt } from '@saschazar/oidc-provider-utils/lib/util/aes';

let masterkey: string;

describe('AES', () => {
  beforeEach(() => {
    masterkey = Buffer.from(randomBytes(64)).toString('base64');
  });

  it('encrypts data', async () => {
    const data = JSON.stringify({ test: true });

    const encrypted = (await encrypt(masterkey, data)) as Buffer;

    expect(encrypted).toHaveProperty('length');
    expect(encrypted.length).toBeGreaterThan(0);
  });

  it('decrypts data', async () => {
    const data = JSON.stringify({ test: true });

    const decrypted = await encrypt(masterkey, data).then((encrypted: Buffer) =>
      decrypt(masterkey, encrypted)
    );

    expect(decrypted).toEqual(data);
  });
});
