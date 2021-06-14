import type { IncomingMessage, ServerResponse } from 'http';

import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import HTTPError from 'utils/lib/util/http_error';

const methods = async (
  req: IncomingMessage,
  res: ServerResponse,
  allowed: METHOD[]
): Promise<boolean> =>
  new Promise((resolve) => {
    const methods = [METHOD.HEAD, METHOD.OPTIONS, ...allowed];
    if (methods.indexOf(req.method as METHOD) < 0) {
      res.setHeader('Allow', methods.join(', '));
      throw new HTTPError(
        `Only ${methods.join(', ')} allowed!`,
        STATUS_CODE.METHOD_NOT_ALLOWED,
        req.method,
        req.url
      );
    }
    return resolve(true);
  });

export default methods;
