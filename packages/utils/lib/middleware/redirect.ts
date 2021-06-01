import type { IncomingMessage, ServerResponse } from 'http';

export interface RedirectOptions {
  location: string;
  status?: number;
}

const middleware = async (
  req: IncomingMessage,
  res: ServerResponse,
  options: RedirectOptions
): Promise<void> =>
  new Promise((resolve) => {
    const { location, status = 302 } = options;
    res.statusCode = status;
    res.setHeader('Location', location);
    return resolve();
  });

export default middleware;
