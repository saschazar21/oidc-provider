import { mockRequest, mockResponse } from 'mock-req-res';
import { NextApiResponse, NextApiRequest } from 'next';

const REDIRECT_PATH = '/test/redirect';

describe('Redirect middleware', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  let setHeader;
  let status;

  beforeEach(async () => {
    jest.resetModules();

    setHeader = jest.fn().mockName('mockSetHeader');
    status = jest.fn().mockName('mockStatus');

    req = {
      ...mockRequest,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    res = {
      ...mockResponse,
      setHeader,
      status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  it(`redirects to ${REDIRECT_PATH}`, async () => {
    const { default: redirect } = await import(
      '~/lib/shared/middleware/redirect'
    );

    const options = {
      location: REDIRECT_PATH,
    };

    await redirect(req, res, options);

    expect(status).toHaveBeenCalledWith(302);
    expect(setHeader).toHaveBeenCalledWith('Location', REDIRECT_PATH);
  });
});
