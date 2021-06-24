import { IncomingMessage, ServerResponse } from 'http';

import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import authorizationMiddleware from 'middleware/lib/authorization';
import methods from 'middleware/lib/methods';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import HTTPError from 'utils/lib/util/http_error';

const authorization = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  await methods(req, res, [METHOD.GET, METHOD.POST]);

  // TODO: HEAD & OPTIONS handling

  try {
    const auth = await authorizationMiddleware(req, res) as AuthorizationSchema;
    if (res.headersSent) {
      return;
    }

    // TODO: finish authorization response
    
  } catch(e) {
    throw e.name === HTTPError.NAME ? e : new HTTPError(e.message, STATUS_CODE.INTERNAL_SERVER_ERROR, req.method, req.url);
  }
};

export default authorization;