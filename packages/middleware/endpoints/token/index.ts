import { IncomingMessage, ServerResponse } from 'http';

import methods from 'middleware/lib/methods';
import tokenMiddleware from 'middleware/lib/token';
import HTTPError from 'utils/lib/errors/http_error';
import TokenError from 'utils/lib/errors/token_error';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';

const token = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex nofollow');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  await methods(req, res, [METHOD.POST]);

  try {
    const tokenResponsePayload = await tokenMiddleware(req, res);
    res.writeHead(STATUS_CODE.OK, {
      'Content-Type': 'application/json; charset=UTF-8',
    });
    res.write(JSON.stringify(tokenResponsePayload));
  } catch (e) {
    throw e.name === TokenError.NAME || e.name === HTTPError.NAME
      ? e
      : new HTTPError(
          e.message,
          STATUS_CODE.INTERNAL_SERVER_ERROR,
          req.method,
          req.url
        );
  }
};

export default token;
