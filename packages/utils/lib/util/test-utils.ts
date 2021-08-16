import { ServerResponse } from 'http';
import MockRes from 'mock-res';

import { UserSchema } from '@saschazar/oidc-provider-database/lib/schemata/user';

export const mockUser: UserSchema = {
  password: '',
  given_name: 'Wainwright',
  middle_name: 'Calwell',
  family_name: 'Parlett',
  email: 'wparlett0@g.co',
  phone_number: '906-214-5198',
  nickname: 'wparlett0',
  picture: 'https://robohash.org/exquiavel.png?size=50x50&set=set1',
  address: {
    street_address: '6330 Forest Dale Lane',
    locality: 'Foros da Catrapona',
    region: 'Setúbal',
    country: 'Portugal',
    postal_code: '2840-051',
  },
};

export type MockResponse = {
  _getJSON: () => { [key: string]: never };
  _getString: () => string;
};

export const flushHeaders = jest.fn(function flushHeaders(): void {
  this._header = this._headers = {};
});

export const mockResponse = (): ServerResponse & MockResponse => {
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
