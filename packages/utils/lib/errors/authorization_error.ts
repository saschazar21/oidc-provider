import { ServerResponse } from 'http';
import { encode } from 'querystring';

import { ERROR_CODE } from '@saschazar/oidc-provider-types/lib/error_code';
import { STATUS_CODE } from '@saschazar/oidc-provider-types/lib/status_code';

class AuthorizationError extends Error implements Error {
  private _errorCode: ERROR_CODE;
  private _redirectUri: string;
  private _state: string;

  protected _statusCode: STATUS_CODE = STATUS_CODE.FOUND;

  public static NAME = 'AuthorizationError';

  public get errorCode(): ERROR_CODE {
    return this._errorCode;
  }

  public get redirectUri(): string {
    return this._redirectUri;
  }

  public get state(): string {
    return this._state;
  }

  public get statusCode(): STATUS_CODE {
    return this._statusCode;
  }

  constructor(
    message: string,
    errorCode: ERROR_CODE,
    redirectUri: string,
    state?: string
  ) {
    super(message);
    this.name = AuthorizationError.NAME;
    this._errorCode = errorCode;
    this._redirectUri = redirectUri;
    this._state = state;
  }

  public response(
    res: ServerResponse,
    statusCode: STATUS_CODE = STATUS_CODE.BAD_REQUEST
  ): void {
    const payload = Object.assign(
      {
        error: this.errorCode,
        error_description: this.message,
      },
      this.state ? { state: this.state } : {}
    );

    if (this.redirectUri) {
      const url = new URL(this.redirectUri);
      url.search = `?${encode(payload)}`;

      res.writeHead(this.statusCode, {
        Location: url.toString(),
        'Content-Length': 0,
      });

      return;
    }

    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=UTF-8',
    });
    res.write(JSON.stringify(payload));
  }
}

export default AuthorizationError;
