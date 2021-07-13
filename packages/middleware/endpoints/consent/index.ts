import { IncomingMessage, ServerResponse } from 'http';

import consentMiddleware from 'middleware/lib/consent';
import methods from 'middleware/lib/methods';
import HTTPError from 'utils/lib/errors/http_error';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';

const consent = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  await methods(req, res, [METHOD.POST]);

  // TODO: HEAD & OPTIONS handling
  try {
    await consentMiddleware(req, res);
    // Ignored headersSent check on purpose
  } catch (e) {
    throw e.name === HTTPError.NAME
      ? e
      : new HTTPError(
          e.message,
          STATUS_CODE.INTERNAL_SERVER_ERROR,
          req.method,
          req.url
        );
  }
};

export default consent;
