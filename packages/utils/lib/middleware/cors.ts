import type { IncomingMessage, ServerResponse } from 'http';
import crossOrigin, { CorsOptions, CorsOptionsDelegate } from 'cors';

const middleware = async (
  req: IncomingMessage,
  res: ServerResponse,
  options: CorsOptions | CorsOptionsDelegate
): Promise<boolean> =>
  new Promise((resolve) => {
    const cors = crossOrigin(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cors(req as any, res as any, (err: any) => {
      if (err instanceof Error) {
        res.statusCode = 500;
        res.statusMessage = 'CORS failed!';
        return resolve(false);
      }
      return resolve(true);
    });
  });

export default middleware;
