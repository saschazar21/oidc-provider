import type { Document } from 'mongoose';

import connect, { disconnect } from '@saschazar/oidc-provider-database/lib/';
import AuthorizationModel, {
  Authorization,
} from '@saschazar/oidc-provider-database/lib/schemata/authorization';
import {
  AccessTokenModel,
  AccessTokenSchema,
  AuthorizationCodeModel,
  AuthorizationCodeSchema,
} from '@saschazar/oidc-provider-database/lib/schemata/token';
import UserModel from '@saschazar/oidc-provider-database/lib/schemata/user';
import AuthorizationError from '@saschazar/oidc-provider-utils/lib/errors/authorization_error';
import encrypt from '@saschazar/oidc-provider-jwt/lib/encrypt';
import sign from '@saschazar/oidc-provider-jwt/lib/sign';
import { JWTAuth } from '@saschazar/oidc-provider-jwt/lib/helpers';
import { RESPONSE_MODE } from '@saschazar/oidc-provider-types/lib/response_mode';
import { SCOPE } from '@saschazar/oidc-provider-types/lib/scope';
import { ERROR_CODE } from '@saschazar/oidc-provider-types/lib/error_code';
import { PROMPT } from '@saschazar/oidc-provider-types/lib/prompt';

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
  private _code: string;
  private _token: string;

  protected _doc: Document<Authorization>;
  protected _filter: { [key: string]: 0 | 1 };

  public get auth(): Authorization {
    return this._auth;
  }

  public get code(): string {
    return this._code;
  }

  public get doc(): Document<Authorization> {
    return this._doc;
  }

  public get filter(): { [key: string]: 0 | 1 } {
    return this._filter;
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
    this._filter = {
      prompt: 0,
    };
  }

  private async validatePrompt(): Promise<boolean> {
    const { client_id, prompt, redirect_uri, state, user } = this.auth;
    if (!prompt?.length) {
      return true;
    }

    if (prompt.includes(PROMPT.NONE)) {
      if (prompt.length > 1) {
        throw new AuthorizationError(
          `Invalid prompt, either '${PROMPT.NONE}' or combination of other values is allowed!`,
          ERROR_CODE.INVALID_REQUEST,
          redirect_uri,
          state
        );
      }

      if (!user) {
        throw new AuthorizationError(
          'No active user session found, but client requires existing authentication!',
          ERROR_CODE.LOGIN_REQUIRED,
          redirect_uri,
          state
        );
      }

      try {
        await connect();
        const userDoc = await UserModel.findById(user, 'consents');
        const consents = userDoc.get('consents');
        if (!Array.isArray(consents) || !consents.includes(client_id)) {
          throw new AuthorizationError(
            `No consent found for client, but client requires existing consent!`,
            ERROR_CODE.INTERACTION_REQUIRED,
            redirect_uri,
            state
          );
        }
      } finally {
        await disconnect();
      }
    }
    return true;
  }

  protected async prevalidate(): Promise<boolean> {
    if (
      !Array.isArray(this.auth.scope) ||
      !this.auth.scope.includes(SCOPE.OPENID)
    ) {
      throw new AuthorizationError(
        `scope parameter must contain "${SCOPE.OPENID}"`,
        ERROR_CODE.INVALID_SCOPE,
        this.auth.redirect_uri,
        this.auth.state
      );
    }

    return this.validatePrompt();
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

  protected async createAuthorizationCode(): Promise<
    Document<AuthorizationCodeSchema>
  > {
    try {
      await connect();
      const code = await AuthorizationCodeModel.create({
        authorization: this.id,
      });
      this._code = code._id as string;
      return code;
    } finally {
      await disconnect();
    }
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
      this.code ? { code: this.code } : null,
      this.token ? { access_token: this.token } : null
    );

    return use === 'sig' ? sign(auth as JWTAuth) : encrypt(auth as JWTAuth);
  }

  protected async validate(): Promise<boolean> {
    if (!this.doc) {
      throw new AuthorizationError(
        'No Authorization available!',
        ERROR_CODE.SERVER_ERROR,
        this.auth.redirect_uri,
        this.auth.state
      );
    }

    const prompts = this.doc.get('prompt');
    if (Array.isArray(prompts) && prompts.includes(PROMPT.LOGIN)) {
      throw new AuthorizationError(
        'Login required!',
        ERROR_CODE.LOGIN_REQUIRED,
        this.auth.redirect_uri,
        this.auth.state
      );
    }

    if (Array.isArray(prompts) && prompts.includes(PROMPT.CONSENT)) {
      throw new AuthorizationError(
        'Consent required!',
        ERROR_CODE.CONSENT_REQUIRED,
        this.auth.redirect_uri,
        this.auth.state
      );
    }

    try {
      await connect();
      const user = await UserModel.findById(
        this.doc.get('user'),
        '_id consents'
      );
      if (!user) {
        throw new AuthorizationError(
          `No user assigned to Authorization ID ${this.id}!`,
          ERROR_CODE.LOGIN_REQUIRED,
          this.auth.redirect_uri,
          this.auth.state
        );
      }
      const consents = user.get('consents');
      if (
        !Array.isArray(consents) ||
        !consents.includes(this.doc.get('client_id'))
      ) {
        throw new AuthorizationError(
          `User has not given consent to Client ID: ${this.auth.client_id}!`,
          ERROR_CODE.CONSENT_REQUIRED,
          this.auth.redirect_uri,
          this.auth.state
        );
      }
      await this.doc.update({ consent: true });
      return true;
    } finally {
      await disconnect();
    }
  }

  public async init(): Promise<Document<Authorization>> {
    await this.prevalidate();

    try {
      await connect();
      this._doc = this.id
        ? await AuthorizationModel.findById(this.id, this.filter)
        : await AuthorizationModel.create(this.auth);
      if (!this.doc) {
        throw new AuthorizationError(
          `Failed to fetch/create Authorization using data: ${JSON.stringify(
            this.auth
          )}`,
          ERROR_CODE.INVALID_REQUEST,
          this.auth.redirect_uri,
          this.auth.state
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
      this._auth = this.doc.toObject() as unknown as Authorization;
      return this.doc;
    } finally {
      await disconnect();
    }
  }

  public abstract responsePayload(): Promise<AuthorizationResponse<T>>;
}

export default AuthStrategy;
