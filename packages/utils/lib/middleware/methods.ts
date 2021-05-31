import { NextApiRequest, NextApiResponse } from 'next';

import { METHOD } from '~/lib/shared/types/method';

const middleware = async (
  req: NextApiRequest,
  res: NextApiResponse,
  allowed: METHOD[],
): Promise<boolean> =>
  new Promise((resolve) => {
    const methods = [METHOD.HEAD, METHOD.OPTIONS, ...allowed];
    if (methods.indexOf(req.method as METHOD) < 0) {
      res.setHeader('Allow', methods.join(', '));
      res.status(405);
      return resolve(false);
    }
    return resolve(true);
  });

export default middleware;
