import { ServerResponse } from 'http';

import AuthorizationError from 'utils/lib/errors/authorization_error';
import { STATUS_CODE } from 'types/lib/status_code';
import { ERROR_CODE } from 'types/lib/error_code';

class AuthenticationError extends AuthorizationError {
  private _realm: string;

  public static NAME = 'AuthenticationError';

  public get realm(): string {
    return this._realm;
  }

  constructor(
    message: string,
    errorCode: ERROR_CODE,
    realm: string,
    statusCode: STATUS_CODE = STATUS_CODE.UNAUTHORIZED
  ) {
    super(message, errorCode, null);
    this._statusCode = statusCode;
    this._realm = realm;
  }

  public response(res: ServerResponse): void {
    res.setHeader(
      'WWW-Authenticate',
      `Bearer realm="${this.realm}", error="${this.errorCode}", error_description="${this.message}"`
    );
    super.response(res);
  }
}

export default AuthenticationError;
