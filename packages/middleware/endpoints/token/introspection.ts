import { IncomingMessage, ServerResponse } from 'http';
import methods from '@saschazar/oidc-provider-middleware/lib/methods';
import introspectionMiddleware from '@saschazar/oidc-provider-middleware/lib/token/introspection';
import errorHandler from '@saschazar/oidc-provider-middleware/lib/error-handler';
import { METHOD } from 'types/lib/method';
import { STATUS_CODE } from 'types/lib/status_code';

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
