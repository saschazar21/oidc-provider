import type { IncomingMessage, ServerResponse } from 'http';

import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';

export interface RedirectOptions {
  location: string;
  statusCode?: STATUS_CODE;
}

const redirect = async (
  _req: IncomingMessage,
  res: ServerResponse,
  options: RedirectOptions
): Promise<void> =>
  new Promise((resolve) => {
    const { location, statusCode = STATUS_CODE.FOUND } = options;
    res.writeHead(statusCode, { location });
    return resolve();
  });

export default redirect;
