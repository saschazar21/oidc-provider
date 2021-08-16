import { IncomingMessage, ServerResponse } from 'http';
import { encode } from 'querystring';

import authorizationMiddleware from '@saschazar/oidc-provider-middleware/lib/authorization';
import { AuthorizationResponse } from '@saschazar/oidc-provider-middleware/strategies/AuthStrategy';
import generateHTML from '@saschazar/oidc-provider-middleware/lib/authorization/form-post';
import { ResponsePayload } from '@saschazar/oidc-provider-middleware/lib/authorization/helper';
import errorHandler from '@saschazar/oidc-provider-middleware/lib/error-handler';
import methods from '@saschazar/oidc-provider-middleware/lib/methods';
import redirect from '@saschazar/oidc-provider-middleware/lib/redirect';
import { METHOD } from 'types/lib/method';
import { STATUS_CODE } from 'types/lib/status_code';
import { RESPONSE_MODE } from 'types/lib/response_mode';

const authorization = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  try {
    await methods(req, res, [METHOD.GET, METHOD.POST]);

    // TODO: HEAD & OPTIONS handling

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
    errorHandler(req, res, e);
  } finally {
    res.end();
  }
};

export default authorization;
