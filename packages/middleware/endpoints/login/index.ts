import { IncomingMessage, ServerResponse } from 'http';

import loginMiddleware from 'middleware/lib/login';
import methods from 'middleware/lib/methods';
import HTTPError from 'utils/lib/errors/http_error';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';

const login = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  await methods(req, res, [METHOD.POST]);

  try {
    await loginMiddleware(req, res);
    // Ignored headersSent check on purpose
  } catch (err) {
    throw err.name === HTTPError.NAME
      ? err
      : new HTTPError(
          err.message,
          STATUS_CODE.INTERNAL_SERVER_ERROR,
          req.method,
          req.url
        );
  }
};

export default login;
