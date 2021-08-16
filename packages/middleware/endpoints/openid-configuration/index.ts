import { IncomingMessage, ServerResponse } from 'http';

import getConfiguration from 'config/lib/openid-configuration';
import methods from '@saschazar/oidc-provider-middleware/lib/methods';
import { METHOD } from 'types/lib/method';
import { STATUS_CODE } from 'types/lib/status_code';
import errorHandler from '@saschazar/oidc-provider-middleware/lib/error-handler';

const openidconfiguration = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  try {
    await methods(req, res, [METHOD.GET]);

    // TODO: HEAD & OPTIONS handling

    const configuration = getConfiguration();

    res.writeHead(STATUS_CODE.OK, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(configuration));
  } catch (e) {
    errorHandler(req, res, e);
  } finally {
    res.end();
  }
};

export default openidconfiguration;
