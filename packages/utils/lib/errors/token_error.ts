import { ServerResponse } from 'http';
import AuthorizationError from 'utils/lib/errors/authorization_error';
import { ERROR_CODE } from 'types/lib/error_code';
import { STATUS_CODE } from 'types/lib/status_code';

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
