import { URL, URLSearchParams } from 'url';
import { NextApiRequest, NextApiResponse } from 'next';

import { authorizationMiddleware } from '@saschazar/oidc-provider-middleware/endpoints/authorization';
import methods from '~/lib/shared/middleware/methods';
import redirect from '~/lib/shared/middleware/redirect';
import { METHOD } from '~/lib/shared/types/method';

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!(await methods(req, res, [METHOD.GET, METHOD.POST]))) {
    return res.end();
  }

  if (req.method !== METHOD.GET && req.method !== METHOD.POST) {
    res.status(204);
    return res.end();
  }

  const authorization = await authorizationMiddleware(req, res);
  if (!authorization) {
    return res.end();
  }

  const { _id: code, redirect_uri, state } = authorization;

  const params = new URLSearchParams(
    Object.assign({}, { code }, state ? { state } : null)
  );
  const url = new URL(redirect_uri);
  url.search = params.toString();

  await redirect(req, res, { location: url.href, status: 302 });
  res.end();
};
