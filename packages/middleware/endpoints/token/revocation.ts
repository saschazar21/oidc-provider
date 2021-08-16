import { IncomingMessage, ServerResponse } from 'http';

import methods from '@saschazar/oidc-provider-middleware/lib/methods';
import revocationMiddleware from '@saschazar/oidc-provider-middleware/lib/token/revocation';
import errorHandler from '@saschazar/oidc-provider-middleware/lib/error-handler';
import { METHOD } from 'types/lib/method';
import { STATUS_CODE } from 'types/lib/status_code';

const revocation = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  await methods(req, res, [METHOD.POST]);

  try {
    await revocationMiddleware(req, res);
    res.writeHead(STATUS_CODE.OK, { 'Content-Length': 0 });
  } catch (e) {
    errorHandler(req, res, e);
  } finally {
    res.end();
  }
};

export default revocation;
