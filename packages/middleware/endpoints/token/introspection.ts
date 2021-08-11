import { IncomingMessage, ServerResponse } from 'http';
import methods from 'middleware/lib/methods';
import introspectionMiddleware from 'middleware/lib/token/introspection';
import errorHandler from 'middleware/lib/error-handler';
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
  } catch (e) {
    errorHandler(req, res, e);
  } finally {
    res.end();
  }
};

export default introspection;
