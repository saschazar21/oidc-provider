import MockRes from 'mock-res';

export const flushHeaders = jest.fn(function flushHeaders(): void {
  this._header = this._headers = {};
});

export const mockResponse = (): any => {
  const res = new MockRes();
  res.flushHeaders = flushHeaders;
  return res;
};
