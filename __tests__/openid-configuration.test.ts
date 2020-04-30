import { NextApiRequest, NextApiResponse } from 'next';
import { mockRequest, mockResponse } from 'mock-req-res';

import mockConfiguration from '~/lib/shared/config/openid-configuration';
import mockLogError from '~/lib/shared/util/log_error';
import fetchConfiguration from '~/pages/api/well-known/openid-configuration';

jest.mock('~/pages/api/well-known/openid-configuration', () => ({
  __esModule: true,
  default: async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      if (process.env.PROVIDER_URL) {
        return res.json(mockConfiguration());
      }
      throw Error();
    } catch(e) {
      const { method, url: path } = req;
      res.status(500);
      res.end('Internal Server Error');
      mockLogError({ method, path, statusCode: 500, message: e.message || e });
    }
  },
}));

describe('/.well-known/openid-configuration', () => {
  console.error = console.log;
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    const json = jest.fn().mockName('mockJSON');
    const setHeader = jest.fn().mockName('mockSetHeader');
    const status = jest.fn().mockName('mockStatus');
    const end = jest.fn().mockName('mockEnd');

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
  });

  it('should fetch the OpenID Configuration', async () => {
    await fetchConfiguration(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow'
    );
    expect(res.json).toHaveBeenCalledWith(mockConfiguration());
    expect(res.end).not.toHaveBeenCalled();
  });
  
  it('should return status 500 upon failure', async () => {
    process.env = {
      ...process.env,
      PROVIDER_URL: undefined,
    }
    
    await fetchConfiguration(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow'
    );
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledWith('Internal Server Error');
  });
});
