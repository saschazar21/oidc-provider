import { IncomingMessage, ServerResponse } from 'http';

import getConfiguration from 'config/lib/openid-configuration';
import methods from 'middleware/lib/methods';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import HTTPError from 'utils/lib/util/http_error';

const openidconfiguration = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  await methods(req, res, [METHOD.GET]);

  // TODO: HEAD & OPTIONS handling

  try {
    const configuration = getConfiguration();

    res.writeHead(STATUS_CODE.OK, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(configuration));
  } catch (e) {
    throw new HTTPError(
      e.message,
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      req.method,
      req.url
    );
  }
};

export default openidconfiguration;
