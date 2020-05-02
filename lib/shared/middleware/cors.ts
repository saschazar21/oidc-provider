import { NextApiRequest, NextApiResponse } from 'next';
import crossOrigin from 'cors';

const config = {};

const cors = crossOrigin(config);

const middleware = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cors(req as any, res as any, (err: Error) => {
      if (err instanceof Error) {
        return reject(err);
      }
      return resolve(true);
    });
  });

export default middleware;
