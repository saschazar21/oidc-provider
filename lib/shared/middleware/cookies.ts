import { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';

import getKeygrip from '~/lib/shared/keys/keygrip';

const middleware = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<Cookies> => {
  const keys = await getKeygrip();
  const cookies = new Cookies(req, res, { keys });

  return cookies;
};

export default middleware;
