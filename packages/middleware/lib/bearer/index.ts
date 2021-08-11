import { IncomingMessage, ServerResponse } from 'http';

import bodyParser from 'middleware/lib/body-parser';

// https://datatracker.ietf.org/doc/html/rfc6750#section-2.1
export const BEARER_REGEX = /^Bearer\s(?<token>[a-zA-Z0-9-._~+/]+=*)$/;

const extractFromAuthHeader = (req: IncomingMessage): string => {
  const authorization = req.headers.authorization;
  if (!authorization) return null;

  const match = BEARER_REGEX.exec(authorization);
  if (!match) return null;

  return match.groups.token;
};

const extractFromBody = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<string> => {
  const { access_token } = (await bodyParser(req, res, 'form')) as {
    access_token: string;
  };
  return access_token || null;
};

const extractToken = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<string> => extractFromAuthHeader(req) || extractFromBody(req, res);

export default extractToken;
