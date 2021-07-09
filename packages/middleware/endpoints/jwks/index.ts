import type { IncomingMessage, ServerResponse } from 'http';

import methods from 'middleware/lib/methods';
import { METHOD } from 'utils/lib/types/method';
import HTTPError from 'utils/lib/errors/http_error';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import getKeys from 'utils/lib/keys';

const jwks = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  await methods(req, res, [METHOD.GET]);

  // TODO: HEAD & OPTIONS handling

  try {
    const { keystore } = await getKeys();
    const keys = keystore.toJWKS();

    res.writeHead(STATUS_CODE.OK, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(keys));
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

export default jwks;
