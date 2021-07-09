import type { Document } from 'mongoose';

import connect, { disconnect } from 'database/lib';
import AuthorizationModel, {
  Authorization,
} from 'database/lib/schemata/authorization';
import {
  AccessTokenModel,
  AccessTokenSchema,
} from 'database/lib/schemata/token';
import UserModel from 'database/lib/schemata/user';
import AuthorizationError from 'utils/lib/errors/authorization_error';
import encrypt from 'utils/lib/jwt/encrypt';
import sign from 'utils/lib/jwt/sign';
import { JWTAuth } from 'utils/lib/jwt/helpers';
import { RESPONSE_MODE } from 'utils/lib/types/response_mode';
import { SCOPE } from 'utils/lib/types/scope';
import { ERROR_CODE } from 'utils/lib/types/error_code';

export type ImplicitOrHybridResponsePayload = {
  access_token: string;
  token_type: string;
  expires_in: number;
  code?: string;
  id_token?: string;
  state?: string;
};

export type AuthorizationResponse<T> = {
  redirect_uri: string;
  response_mode: RESPONSE_MODE;
  payload: T;
};

abstract class AuthStrategy<T> {
  public static readonly DEFAULT_RESPONSE_MODE: RESPONSE_MODE =
    RESPONSE_MODE.QUERY;

  private _auth: Authorization;
  private _id: string;
  private _token: string;

  protected _doc: Document<Authorization>;

  public get auth(): Authorization {
    return this._auth;
  }

  public get doc(): Document<Authorization> {
    return this._doc;
  }

  public get id(): string {
    return this._id;
  }

  public get token(): string {
    return this._token;
  }

  constructor(auth: Authorization) {
    const { _id, ...rest } = auth;
    this._id = _id;
    this._auth = rest;

    this.prevalidate();
  }

  protected prevalidate(): boolean {
    if (
      !Array.isArray(this.auth.scope) ||
      !this.auth.scope.includes(SCOPE.OPENID)
    ) {
      throw new AuthorizationError(
        `scope parameter must contain "${SCOPE.OPENID}"`,
        ERROR_CODE.INVALID_SCOPE
      );
    }
    return true;
  }

  private sanitizeUpdate(): Authorization {
    return Object.keys(this.auth).reduce(
      (obj: Authorization, key: string): Authorization =>
        Object.assign(
          {},
          {
            ...obj,
          },
          !this.doc.get(key) || this.doc.get(key).length === 0
            ? { [key]: this.auth[key] }
            : null
        ),
      {} as Authorization
    );
  }

  protected async createAccessToken(): Promise<Document<AccessTokenSchema>> {
    try {
      await connect();
      const token = await AccessTokenModel.create({ authorization: this.id });
      this._token = token._id as string;
      return token;
    } finally {
      await disconnect();
    }
  }

  protected async createIdToken(use: 'sig' | 'enc' = 'sig'): Promise<string> {
    const auth = Object.assign(
      {},
      { ...this.auth },
      this.token ? { access_token: this.token } : null
    );

    return use === 'sig' ? sign(auth as JWTAuth) : encrypt(auth as JWTAuth);
  }

  protected async validate(): Promise<boolean> {
    if (!this.doc) {
      throw new AuthorizationError(
        'No Authorization available!',
        ERROR_CODE.SERVER_ERROR
      );
    }

    try {
      await connect();
      if (!(await UserModel.findById(this.doc.get('user'), '_id'))) {
        throw new AuthorizationError(
          `No user assigned to Authorization ID ${this.id}!`,
          ERROR_CODE.LOGIN_REQUIRED
        );
      }
      if (!this.doc.get('consent')) {
        throw new AuthorizationError(
          `User has not given consent to Authorization ID: ${this.id}!`,
          ERROR_CODE.CONSENT_REQUIRED
        );
      }
      return true;
    } finally {
      await disconnect();
    }
  }

  public async init(): Promise<Document<Authorization>> {
    try {
      await connect();
      this._doc = this.id
        ? await AuthorizationModel.findById(this.id)
        : await AuthorizationModel.create(this.auth);
      if (!this.doc) {
        throw new AuthorizationError(
          `Failed to fetch/create Authorization using data: ${JSON.stringify(
            this.auth
          )}`,
          ERROR_CODE.INVALID_REQUEST
        );
      }
      const sanitized = this.id && this.sanitizeUpdate();
      if (sanitized && Object.keys(sanitized).length > 0) {
        this._doc = await AuthorizationModel.findByIdAndUpdate(
          this.id,
          sanitized,
          {
            new: true,
            omitUndefined: true,
            timestamps: true,
          }
        );
      }
      this._id = this.doc.get('_id');
      this._auth = this.doc.toJSON() as unknown as Authorization;
      return this.doc;
    } finally {
      await disconnect();
    }
  }

  public abstract responsePayload(): Promise<AuthorizationResponse<T>>;
}

export default AuthStrategy;
