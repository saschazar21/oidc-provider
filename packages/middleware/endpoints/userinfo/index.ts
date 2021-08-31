import { IncomingMessage, ServerResponse } from 'http';
import errorHandler from '@saschazar/oidc-provider-middleware/lib/error-handler';
import methods from '@saschazar/oidc-provider-middleware/lib/methods';
import userinfoMiddleware from '@saschazar/oidc-provider-middleware/lib/userinfo';
import { METHOD } from '@saschazar/oidc-provider-types/lib/method';
import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';

const userinfo = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  try {
    await methods(req, res, [METHOD.GET, METHOD.POST]);

    const claims = await userinfoMiddleware(req, res);

    res.writeHead(STATUS_CODE.OK, {
      'Content-Type': 'application/json; charset=UTF-8',
    });
    res.write(JSON.stringify(claims));
  } catch (err) {
    errorHandler(req, res, err);
  } finally {
    res.end();
  }
};

export default userinfo;
