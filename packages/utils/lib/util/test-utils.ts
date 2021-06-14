import MockRes from 'mock-res';

export const flushHeaders = jest.fn(function flushHeaders(): void {
  this._header = this._headers = {};
});

export const mockResponse = () => {
  const res = new MockRes();
  res.flushHeaders = flushHeaders;
  return res;
};

export const objToUrlEncoded = (payload: {
  [key: string]: string | number | boolean;
}): string =>
  Object.keys(payload).reduce((url: string, key: string) => {
    if (typeof payload[key] === 'undefined' || payload[key] === null) {
      return url;
    }

    const segment = `${encodeURIComponent(key)}=${encodeURIComponent(
      payload[key]
    )}`;
    return url.length > 0 ? `${url}&${segment}` : segment;
  }, '');
