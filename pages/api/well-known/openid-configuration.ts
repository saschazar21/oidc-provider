import { NextApiRequest, NextApiResponse } from 'next';

import getConfiguration from '~/lib/shared/config/openid-configuration';
import logError from '~/lib/shared/util/log_error';

export default (req: NextApiRequest, res: NextApiResponse): void => {
  try {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.json(getConfiguration());
  } catch (e) {
    const { method, url: path } = req;
    res.status(500).end('Internal Server Error');

    logError({
      method,
      path,
      statusCode: 500,
      message: e.message || e,
    });
  }
};
