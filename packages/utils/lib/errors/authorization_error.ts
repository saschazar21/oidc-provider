import { ERROR_CODE } from 'utils/lib/types/error_code';

class AuthorizationError extends Error implements Error {
  private _errorCode: ERROR_CODE;

  public static NAME = 'AuthorizationError';

  public get errorCode(): ERROR_CODE {
    return this._errorCode;
  }

  constructor(message: string, errorCode: ERROR_CODE) {
    super(message);
    this.name = AuthorizationError.NAME;
    this._errorCode = errorCode;
  }
}

export default AuthorizationError;
