import { NextApiRequest, NextApiResponse } from 'next';
import crossOrigin from 'cors';

const config = {};

const cors = crossOrigin(config);

const middleware = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    cors(req as any, res as any, (err: any) => {
      if (err instanceof Error) {
        return reject(err);
      }
      return resolve(true);
    });
  });

export default middleware;
