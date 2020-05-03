import { NextApiRequest, NextApiResponse } from 'next';

export interface RedirectOptions {
  location: string;
  status?: number;
}

const middleware = async (
  req: NextApiRequest,
  res: NextApiResponse,
  options: RedirectOptions,
): Promise<void> =>
  new Promise((resolve) => {
    const { location, status = 302 } = options;
    res.status(status);
    res.setHeader('Location', location);
    return resolve();
  });

export default middleware;
