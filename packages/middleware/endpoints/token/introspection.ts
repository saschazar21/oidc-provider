import { IncomingMessage, ServerResponse } from 'http';
import methods from 'middleware/lib/methods';
import introspectionMiddleware from 'middleware/lib/token/introspection';
import HTTPError from 'utils/lib/errors/http_error';
import TokenError from 'utils/lib/errors/token_error';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';

const introspection = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  await methods(req, res, [METHOD.POST]);

  try {
    const payload = await introspectionMiddleware(req, res);
    res.writeHead(STATUS_CODE.OK, {
      'Content-Type': 'application/json; charset=UTF-8',
    });
    res.write(JSON.stringify(payload));
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

export default introspection;
