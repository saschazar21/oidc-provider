import MockRequest from 'mock-req';
import type { ServerResponse, IncomingMessage } from 'http';

import { STATUS_CODE } from 'types/lib/status_code';
import { mockResponse } from 'utils/lib/util/test-utils';

const REDIRECT_PATH = '/test/redirect';

describe('Redirect middleware', () => {
  let req: IncomingMessage;
  let res: ServerResponse;

  beforeEach(async () => {
    jest.resetModules();

    req = new MockRequest();

    res = mockResponse();
  });

  it(`redirects to ${REDIRECT_PATH}`, async () => {
    const { default: redirect } = await import(
      '@saschazar/oidc-provider-middleware/lib/redirect'
    );

    const options = {
      location: REDIRECT_PATH,
    };

    await redirect(req, res, options);

    expect(res.statusCode).toEqual(STATUS_CODE.FOUND);
    expect(res.getHeader('location')).toEqual(REDIRECT_PATH);
  });
});
