import { IncomingMessage, ServerResponse } from 'http';
import errorHandler from '@saschazar/oidc-provider-middleware/lib/error-handler';

import methods from '@saschazar/oidc-provider-middleware/lib/methods';
import tokenMiddleware from '@saschazar/oidc-provider-middleware/lib/token';
import { METHOD } from 'types/lib/method';
import { STATUS_CODE } from 'types/lib/status_code';

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
