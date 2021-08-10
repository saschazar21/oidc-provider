import { IncomingMessage, ServerResponse } from 'http';

import methods from 'middleware/lib/methods';
import revocationMiddleware from 'middleware/lib/token/revocation';
import HTTPError from 'utils/lib/errors/http_error';
import TokenError from 'utils/lib/errors/token_error';
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
  } catch (err) {
    throw err.name === TokenError.NAME || err.name === HTTPError.NAME
      ? err
      : new HTTPError(
          err.message,
          STATUS_CODE.INTERNAL_SERVER_ERROR,
          req.method,
          req.url
        );
  }
};

export default revocation;
