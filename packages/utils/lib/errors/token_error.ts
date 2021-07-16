import AuthorizationError from 'utils/lib/errors/authorization_error';
import { ERROR_CODE } from 'utils/lib/types/error_code';
import { STATUS_CODE } from 'utils/lib/types/status_code';

class TokenError extends AuthorizationError {
  private _statusCode: STATUS_CODE;

  public static NAME = 'TokenError';

  constructor(
    message: string,
    errorCode: ERROR_CODE,
    statusCode?: STATUS_CODE
  ) {
    super(message, errorCode);
    this._statusCode = statusCode || STATUS_CODE.BAD_REQUEST;
    this.name = TokenError.NAME;
  }

  public get statusCode(): STATUS_CODE {
    return this._statusCode;
  }
}

export default TokenError;
