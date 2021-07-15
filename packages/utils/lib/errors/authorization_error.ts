import { ERROR_CODE } from 'utils/lib/types/error_code';

class AuthorizationError extends Error implements Error {
  private _errorCode: ERROR_CODE;

  protected static _NAME = 'AuthorizationError';

  public static get NAME(): string {
    return AuthorizationError._NAME;
  }

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
