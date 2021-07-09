import { ERROR_CODE } from 'utils/lib/types/error_code';

class AuthorizationError extends Error implements Error {
  private _errorCode: ERROR_CODE;

  public static readonly NAME = 'AuthorizationError';

  constructor(message: string, errorCode: ERROR_CODE) {
    super(message);
    this._errorCode = errorCode;
  }

  public get errorCode(): ERROR_CODE {
    return this._errorCode;
  }
}

export default AuthorizationError;
