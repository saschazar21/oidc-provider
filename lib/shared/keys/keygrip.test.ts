import createKeys, { KEYGRIP_LENGTH } from '~/lib/shared/config/keygrip';
import keygrip from '~/lib/shared/keys/keygrip';

const TEST_STRING = 'hello world';

describe('Keygrip', () => {
  it('creates random IDs', async () => {
    const ids = await createKeys();

    expect(ids).toHaveLength(KEYGRIP_LENGTH);
  });

  it('creates new Keygrip object', async () => {
    const keys = await keygrip();

    expect(keys).toBeDefined();
  });

  it('signs and verifies data', async () => {
    const keys = await keygrip();

    const signature = keys.sign(TEST_STRING);
    const verification = keys.verify(TEST_STRING, signature);

    expect(verification).toBeTruthy();
  });
});
