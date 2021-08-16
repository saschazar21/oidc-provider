import { IncomingMessage, ServerResponse } from 'http';
import errorHandler from '@saschazar/oidc-provider-middleware/lib/error-handler';

import loginMiddleware from '@saschazar/oidc-provider-middleware/lib/login';
import methods from '@saschazar/oidc-provider-middleware/lib/methods';
import { METHOD } from 'types/lib/method';

const login = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  try {
    await methods(req, res, [METHOD.POST]);

    await loginMiddleware(req, res);
    // Ignored headersSent check on purpose
  } catch (err) {
    errorHandler(req, res, err);
  } finally {
    res.end();
  }
};

export default login;
