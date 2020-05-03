import { NextApiRequest, NextApiResponse } from 'next';

import getKeys from '~/lib/shared/keys';
import methods from '~/lib/shared/middleware/methods';
import { METHOD } from '~/lib/shared/types/method';
import logError from '~/lib/shared/util/log_error';

export default async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!(await methods(req, res, [METHOD.GET]))) {
    return res.end();
  }

  try {
    const { keystore } = await getKeys();
    const jwks = keystore.toJWKS();

    res.json(jwks);
  } catch (e) {
    const { method, url: path } = req;
    res.status(500).end('Internal Server Error');

    logError({ method, path, statusCode: 500, message: e.message || e });
  }
};
