import { NextApiRequest, NextApiResponse } from 'next';

import { authorizationMiddleware } from '~/lib/main/authorization';
import methods from '~/lib/shared/middleware/methods';
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

  const authorizationId = await authorizationMiddleware(req, res);
  if (!authorizationId) {
    return res.end();
  }

  res.end();
};
