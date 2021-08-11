import { IncomingMessage, ServerResponse } from 'http';

import methods from 'middleware/lib/methods';
import revocationMiddleware from 'middleware/lib/token/revocation';
import errorHandler from 'middleware/lib/error-handler';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';

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
