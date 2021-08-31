import { ServerResponse } from 'http';

import { ERROR_CODE } from '@saschazar/oidc-provider-types/lib/error_code';
import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';

import AuthorizationError from './authorization_error';

class TokenError extends AuthorizationError {
  public static NAME = 'TokenError';

  constructor(
    message: string,
    errorCode: ERROR_CODE,
    statusCode?: STATUS_CODE
  ) {
    super(message, errorCode, null);
    this._statusCode = statusCode || STATUS_CODE.BAD_REQUEST;
    this.name = TokenError.NAME;
  }

  public response(res: ServerResponse): void {
    super.response(res, this.statusCode);
  }
}

export default TokenError;
