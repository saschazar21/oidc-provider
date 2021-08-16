import type { IncomingMessage, ServerResponse } from 'http';

import errorHandler from '@saschazar/oidc-provider-middleware/lib/error-handler';
import methods from '@saschazar/oidc-provider-middleware/lib/methods';
import { METHOD } from 'types/lib/method';
import { STATUS_CODE } from 'types/lib/status_code';
import getKeys from 'utils/lib/keys';

const jwks = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  try {
    await methods(req, res, [METHOD.GET]);

    // TODO: HEAD & OPTIONS handling

    const { keystore } = await getKeys();
    const keys = await keystore.toJWKS();

    res.writeHead(STATUS_CODE.OK, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(keys));
  } catch (e) {
    errorHandler(req, res, e);
  } finally {
    res.end();
  }
};

export default jwks;
