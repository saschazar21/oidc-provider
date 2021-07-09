import { IncomingMessage, ServerResponse } from 'http';
import { encode } from 'querystring';

import authorizationMiddleware from 'middleware/lib/authorization';
import { AuthorizationResponse } from 'middleware/strategies/AuthStrategy';
import generateHTML from 'middleware/lib/authorization/form-post';
import { ResponsePayload } from 'middleware/lib/authorization/helper';
import methods from 'middleware/lib/methods';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import HTTPError from 'utils/lib/errors/http_error';
import { RESPONSE_MODE } from 'utils/lib/types/response_mode';
import redirect from 'middleware/lib/redirect';

const authorization = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  await methods(req, res, [METHOD.GET, METHOD.POST]);

  // TODO: HEAD & OPTIONS handling

  try {
    const auth = (await authorizationMiddleware(
      req,
      res
    )) as AuthorizationResponse<ResponsePayload>;

    if (res.headersSent) {
      return;
    }

    let body: string;
    const { redirect_uri, response_mode, payload } = auth || {};
    const encoded = encode(payload);

    const url = new URL(redirect_uri);
    switch (response_mode) {
      case RESPONSE_MODE.FRAGMENT:
        url.hash = encoded;
        break;
      case RESPONSE_MODE.QUERY:
        url.search = encoded;
        break;
      case RESPONSE_MODE.FORM_POST:
        body = generateHTML(auth);
        break;
    }

    if (body) {
      res.writeHead(STATUS_CODE.OK, {
        'content-type': 'text/html; charset=UTF-8',
      });
      res.write(body);
      return;
    }

    const statusCode =
      req.method === METHOD.POST
        ? STATUS_CODE.SEE_OTHER
        : STATUS_CODE.TEMPORARY_REDIRECT;

    return redirect(req, res, { location: url.toString(), statusCode });
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

export default authorization;
