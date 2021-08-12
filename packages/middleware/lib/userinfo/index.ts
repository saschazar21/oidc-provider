import { IncomingMessage, ServerResponse } from 'http';

import bearerMiddleware from 'middleware/lib/bearer';
import {
  getClaims,
  UserInfoResponsePayload,
} from 'middleware/lib/userinfo/helpers';
import TokenError from 'utils/lib/errors/token_error';
import { ERROR_CODE } from 'utils/lib/types/error_code';

const userinfoMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<UserInfoResponsePayload> => {
  const token = await bearerMiddleware(req, res);

  if (!token) {
    throw new TokenError('Missing token', ERROR_CODE.INVALID_REQUEST);
  }

  return getClaims(token);
};

export default userinfoMiddleware;
