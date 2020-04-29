import { NextApiRequest, NextApiResponse } from 'next';

import getKeys from '~/lib/shared/keys';
import logError from '~/lib/shared/util/log_error';

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  try {
    const { keystore } = await getKeys();
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.json(keystore.toJWKS());
  } catch (e) {
    const { method, url: path } = req;
    res.status(500).end('Internal Server Error');

    logError({ method, path, statusCode: 500, message: e.message || e });
  }
};
