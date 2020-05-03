import { NextApiRequest, NextApiResponse } from 'next';
import crossOrigin, { CorsOptions, CorsOptionsDelegate } from 'cors';

const middleware = async (
  req: NextApiRequest,
  res: NextApiResponse,
  options: CorsOptions | CorsOptionsDelegate,
): Promise<boolean> =>
  new Promise((resolve) => {
    const cors = crossOrigin(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cors(req as any, res as any, (err: Error) => {
      if (err instanceof Error) {
        res.status(500);
        return resolve(false);
      }
      return resolve(true);
    });
  });

export default middleware;
