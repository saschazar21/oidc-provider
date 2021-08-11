import { IncomingMessage, ServerResponse } from 'http';
import errorHandler from 'middleware/lib/error-handler';

import methods from 'middleware/lib/methods';
import tokenMiddleware from 'middleware/lib/token';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';

const token = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  await methods(req, res, [METHOD.POST]);

  try {
    const tokenResponsePayload = await tokenMiddleware(req, res);
    res.writeHead(STATUS_CODE.OK, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    });
    res.write(JSON.stringify(tokenResponsePayload));
  } catch (e) {
    errorHandler(req, res, e);
  } finally {
    res.end();
  }
};

export default token;
