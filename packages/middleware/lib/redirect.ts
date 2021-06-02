import type { IncomingMessage, ServerResponse } from 'http';

import { STATUS_CODE } from 'utils/lib/types/status_code';

export interface RedirectOptions {
  location: string;
  statusCode?: STATUS_CODE;
}

const middleware = async (
  _req: IncomingMessage,
  res: ServerResponse,
  options: RedirectOptions
): Promise<void> =>
  new Promise((resolve) => {
    const { location, statusCode = STATUS_CODE.FOUND } = options;
    res.statusCode = statusCode;
    res.setHeader('Location', location);
    return resolve();
  });

export default middleware;
