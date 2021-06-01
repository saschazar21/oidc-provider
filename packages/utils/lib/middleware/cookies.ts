import type { IncomingMessage, ServerResponse } from 'http';
import Cookies from 'cookies';

import getKeys from 'utils/lib/keys';

const middleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<Cookies> => {
  const { keygrip: keys } = await getKeys();
  const cookies = new Cookies(req, res, { keys });

  return cookies;
};

export default middleware;
