describe('URL', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should resolve to PROVIDER_URL when set', async () => {
    const { getUrl } = await import('config/lib/url');

    expect(process.env.PROVIDER_URL).toBeDefined();
    expect(getUrl()).toMatch(new RegExp(`^${process.env.PROVIDER_URL}`));
  });

  it('should throw when PROVIDER_URL is unset', async () => {
    process.env = {
      ...process.env,
      PROVIDER_URL: undefined,
    };

    const { getUrl } = await import('config/lib/url');

    expect(getUrl).toThrowError(
      'ERROR: No PROVIDER_URL env set, or no URL set by your deployment provider!'
    );
  });
});
