import { IncomingMessage, ServerResponse } from 'http';

import AuthenticationError from '@saschazar/oidc-provider-utils/lib/errors/authentication_error';
import AuthorizationError from '@saschazar/oidc-provider-utils/lib/errors/authorization_error';
import HTTPError from '@saschazar/oidc-provider-utils/lib/errors/http_error';
import logError from '@saschazar/oidc-provider-utils/lib/errors/log_error';
import TokenError from '@saschazar/oidc-provider-utils/lib/errors/token_error';
import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';

const errorHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  err: Error | AuthenticationError | AuthorizationError | HTTPError | TokenError
): void => {
  switch (err.name) {
    case AuthenticationError.NAME:
    case AuthorizationError.NAME:
    case TokenError.NAME:
      logError({
        message: err.message,
        statusCode: (err as AuthorizationError | HTTPError | TokenError)
          .statusCode,
        path: req.url,
        method: req.method,
      });
    case HTTPError.NAME:
      (err as AuthorizationError | HTTPError | TokenError).response(res);
      break;
    default:
      logError({
        message: err.message,
        statusCode: STATUS_CODE.INTERNAL_SERVER_ERROR,
        path: req.url,
        method: req.method,
      });
      res.writeHead(STATUS_CODE.INTERNAL_SERVER_ERROR, {
        'Content-Type': 'text/plain; charset=UTF-8',
      });
      res.write('Internal Server Error');
  }
};

export default errorHandler;
