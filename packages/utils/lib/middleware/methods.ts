import type { IncomingMessage, ServerResponse } from 'http';

import { METHOD } from 'utils/lib/types/method';

const middleware = async (
  req: IncomingMessage,
  res: ServerResponse,
  allowed: METHOD[]
): Promise<boolean> =>
  new Promise((resolve) => {
    const methods = [METHOD.HEAD, METHOD.OPTIONS, ...allowed];
    if (methods.indexOf(req.method as METHOD) < 0) {
      res.setHeader('Allow', methods.join(', '));
      res.statusCode = 405;
      return resolve(false);
    }
    return resolve(true);
  });

export default middleware;
