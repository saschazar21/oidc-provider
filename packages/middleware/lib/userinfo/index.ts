import { IncomingMessage, ServerResponse } from 'http';

import bearerMiddleware from '@saschazar/oidc-provider-middleware/lib/bearer';
import {
  getClaims,
  UserInfoResponsePayload,
} from '@saschazar/oidc-provider-middleware/lib/userinfo/helpers';
import AuthenticationError from 'utils/lib/errors/authentication_error';
import { ERROR_CODE } from 'types/lib/error_code';

const userinfoMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<UserInfoResponsePayload> => {
  const token = await bearerMiddleware(req, res);

  if (!token) {
    throw new AuthenticationError(
      'Missing token',
      ERROR_CODE.INVALID_TOKEN,
      'userinfo'
    );
  }

  return getClaims(token);
};

export default userinfoMiddleware;
