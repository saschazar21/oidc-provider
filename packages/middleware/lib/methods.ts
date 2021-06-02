import type { IncomingMessage, ServerResponse } from 'http';

import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';

const middleware = async (
  req: IncomingMessage,
  res: ServerResponse,
  allowed: METHOD[]
): Promise<boolean> =>
  new Promise((resolve) => {
    const methods = [METHOD.HEAD, METHOD.OPTIONS, ...allowed];
    if (methods.indexOf(req.method as METHOD) < 0) {
      res.statusCode = STATUS_CODE.METHOD_NOT_ALLOWED;
      res.setHeader('Allow', methods.join(', '));
      return resolve(false);
    }
    return resolve(true);
  });

export default middleware;
