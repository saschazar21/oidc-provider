import { IncomingMessage, ServerResponse } from 'http';

import bodyParser from 'middleware/lib/body-parser';
import TokenError from 'utils/lib/errors/token_error';
import { ERROR_CODE } from 'utils/lib/types/error_code';
import { METHOD } from 'utils/lib/types/method';
import { STATUS_CODE } from 'utils/lib/types/status_code';

// https://datatracker.ietf.org/doc/html/rfc6750#section-2.1
export const BEARER_REGEX = /^Bearer\s(?<token>[a-zA-Z0-9-._~+/]+=*)$/;

const extractFromAuthHeader = (req: IncomingMessage): string => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return null;
  }

  const match = BEARER_REGEX.exec(authorization);
  if (!match) {
    return null;
  }

  return match.groups.token;
};

const extractFromBody = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<string> => {
  if (req.method === METHOD.GET) {
    return null;
  }

  const { access_token } = (await bodyParser(req, res, 'form')) as {
    access_token: string;
  };
  return access_token || null;
};

const extractFromQueryParamter = (req: IncomingMessage): string => {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    return params.get('access_token') || null;
  } catch {
    return null;
  }
};

const bearerMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<string> => {
  const found = await Promise.all([
    extractFromAuthHeader(req),
    extractFromBody(req, res),
    extractFromQueryParamter(req),
  ]).then((tokens) => tokens.filter((t) => !!t));

  if (found.length > 1) {
    throw new TokenError(
      'Multiple access tokens found in request',
      ERROR_CODE.INVALID_REQUEST,
      STATUS_CODE.BAD_REQUEST
    );
  }

  return found.length ? found[0] : null;
};

export default bearerMiddleware;
