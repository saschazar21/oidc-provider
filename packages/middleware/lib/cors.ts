import type { IncomingMessage, ServerResponse } from 'http';
import crossOrigin, { CorsOptions, CorsOptionsDelegate } from 'cors';

import { STATUS_CODE } from 'utils/lib/types/status_code';

const middleware = async (
  req: IncomingMessage,
  res: ServerResponse,
  options: CorsOptions | CorsOptionsDelegate
): Promise<boolean> =>
  new Promise((resolve) => {
    const cors = crossOrigin(options);
    cors(req, res, (err: any) => {
      if (err instanceof Error) {
        res.statusCode = STATUS_CODE.INTERNAL_SERVER_ERROR;
        res.statusMessage = 'CORS failed!';
        return resolve(false);
      }
      return resolve(true);
    });
  });

export default middleware;
