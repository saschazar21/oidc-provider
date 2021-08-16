import { IncomingMessage, ServerResponse } from 'http';

import consentMiddleware from '@saschazar/oidc-provider-middleware/lib/consent';
import errorHandler from '@saschazar/oidc-provider-middleware/lib/error-handler';
import methods from '@saschazar/oidc-provider-middleware/lib/methods';
import { METHOD } from 'types/lib/method';

const consent = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  try {
    await methods(req, res, [METHOD.POST]);

    // TODO: HEAD & OPTIONS handling

    await consentMiddleware(req, res);
    // Ignored headersSent check on purpose
  } catch (e) {
    errorHandler(req, res, e);
  } finally {
    res.end();
  }
};

export default consent;
