import { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';

import getKeys from '~/lib/shared/keys';

const middleware = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<Cookies> => {
  const { keygrip: keys } = await getKeys();
  const cookies = new Cookies(req, res, { keys });

  return cookies;
};

export default middleware;
