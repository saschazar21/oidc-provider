import { ServerResponse } from 'http';
import MockRes from 'mock-res';

export const flushHeaders = jest.fn(function flushHeaders(): void {
  this._header = this._headers = {};
});

export const mockResponse = (): ServerResponse => {
  const res = new MockRes();
  res.flushHeaders = flushHeaders;
  res.writeHead = jest.fn(function writeHead(
    statusCode: number,
    headers: { [key: string]: string | number | boolean }
  ): void {
    this.statusCode = statusCode;
    this._header = this._headers = {
      ...this._header,
      ...this._headers,
      ...Object.keys(headers).reduce(
        (obj: { [key: string]: string | number | boolean }, key: string) => ({
          ...obj,
          [key.toLowerCase()]: headers[key],
        }),
        {} as { [key: string]: string | number | boolean }
      ),
    };
    this.headersSent = true;
  });
  return res;
};
