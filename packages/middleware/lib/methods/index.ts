import type { IncomingMessage, ServerResponse } from 'http';

import { METHOD } from '@saschazar/oidc-provider-types/lib/method';
import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';
import HTTPError from '@saschazar/oidc-provider-utils/lib/errors/http_error';

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
