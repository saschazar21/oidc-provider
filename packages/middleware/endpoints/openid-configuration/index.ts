import { IncomingMessage, ServerResponse } from 'http';

import getConfiguration from 'config/lib/openid-configuration';
import methods from 'middleware/lib/methods';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import errorHandler from 'middleware/lib/error-handler';

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
