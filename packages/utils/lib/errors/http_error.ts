import { STATUS_CODES } from 'http';

import { id } from 'utils/lib/util/id';
import { STATUS_CODE } from 'utils/lib/types/status_code';
import logError from 'utils/lib/errors/log_error';

class HTTPError extends Error implements Error {
  private _id: string;
  private _method: string;
  private _path: string;
  private _statusCode: number;

  public static readonly ID_LENGTH = 5;
  public static readonly NAME = 'HTTPError';
  public static generateID(): string {
    return id(HTTPError.ID_LENGTH)();
  }

  constructor(
    message: string,
    statusCode: STATUS_CODE,
    method: string,
    path: string
  ) {
    super(message);
    this.name = HTTPError.NAME;
    this._id = HTTPError.generateID();
    this._method = method;
    this._path = path;
    this._statusCode = statusCode;

    this.log();
  }

  get id(): string {
    return this._id;
  }

  get statusCode(): number {
    return this._statusCode;
  }

  public log(): void {
    logError({
      id: this.id,
      method: this._method ?? '<None>',
      path: this._path ?? '<None>',
      statusCode: this.statusCode,
      message: this.message,
    });
  }

  public toString(): string {
    return `
${this.statusCode} ${STATUS_CODES[this.statusCode]}
[ID: ${this.id}]
`;
  }
}

export default HTTPError;
