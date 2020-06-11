import { NextApiRequest, NextApiResponse } from 'next';

import { loginMiddleware } from '~/lib/main/login';
import methods from '~/lib/shared/middleware/methods';
import redirect from '~/lib/shared/middleware/redirect';
import { METHOD } from '~/lib/shared/types/method';
import logError from '~/lib/shared/util/log_error';

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!(await methods(req, res, [METHOD.POST]))) {
    return res.end();
  }

  if (req.method !== METHOD.POST) {
    res.status(204);
    return res.end();
  }

  try {
    await loginMiddleware(req, res);
  } catch (e) {
    logError(e);
    const { headers: { referer } = {} } = req;
    await redirect(req, res, { location: referer, status: 303 });
    return res.end();
  }
};
