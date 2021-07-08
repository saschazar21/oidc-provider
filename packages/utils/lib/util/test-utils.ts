import MockRes from 'mock-res';

export const flushHeaders = jest.fn(function flushHeaders(): void {
  this._header = this._headers = {};
});

export const mockResponse = (): any => {
  const res = new MockRes();
  res.flushHeaders = flushHeaders;
  res.writeHead = jest.fn(function writeHead(
    statusCode: number,
    headers: object
  ): void {
    this.statusCode = statusCode;
    this._header = this._headers = {
      ...this._header,
      ...this._headers,
      ...headers,
    };
    this.headersSent = true;
  });
  return res;
};
