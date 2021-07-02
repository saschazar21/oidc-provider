import { ALPHABET_LENGTH } from 'config/lib/id';
import { id } from 'utils/lib/util/id';
import hashCodeOrToken from './hash-code-token';

describe('Hash AccessToken or Authorization Code', () => {
  const generateId = id(ALPHABET_LENGTH.LONG);
  it('hashes an ID using default algorithm', async () => {
    const token = await generateId();
    const hash = hashCodeOrToken(token);

    expect(hash).toHaveLength(24);
  });

  it('hashes an ID string using custom algorithm', async () => {
    const token = await generateId();

    const customAlgorithm = 'sha384';

    const hash = hashCodeOrToken(token, customAlgorithm);

    expect(hash).toHaveLength(32);
  });
});
