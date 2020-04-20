import { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';

import getKeygrip from '~/lib/shared/keys/keygrip';

const middleware = (req: NextApiRequest, res: NextApiResponse): Cookies => {
  const keys = getKeygrip();
  const cookies = new Cookies(req, res, { keys });

  return cookies;
};

export default middleware;
