import { NextApiRequest, NextApiResponse } from 'next';
import { mockRequest, mockResponse } from 'mock-req-res';

import fetchConfiguration from '~/pages/api/well-known/openid-configuration';
import { OpenIDConfiguration } from '~/lib/shared/config/openid-configuration';

describe('/.well-known/openid-configuration', () => {
  let configuration: () => OpenIDConfiguration;

  let json;
  let setHeader;
  let status;
  let end;

  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    json = jest.fn().mockName('mockJSON');
    setHeader = jest.fn().mockName('mockSetHeader');
    status = jest.fn().mockName('mockStatus');
    end = jest.fn().mockName('mockEnd');

    req = mockRequest({
      method: 'GET',
      url: '/.well-known/openid-configuration',
    }) as any;

    res = mockResponse({
      json,
      setHeader,
      status,
      end,
    }) as any;

    jest.isolateModules(() => {
      configuration = require('~/lib/shared/config/openid-configuration')
        .default;
    });
  });

  it('should fetch a the OpenID Configuration', async () => {
    await fetchConfiguration(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow'
    );
    expect(res.json).toHaveBeenCalledWith(configuration());
    expect(res.status).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
