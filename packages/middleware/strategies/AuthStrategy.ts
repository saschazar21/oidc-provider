import type { Document } from 'mongoose';

import AuthorizationModel, {
  AuthorizationSchema,
} from 'database/lib/schemata/authorization';
import { RESPONSE_MODE } from 'utils/lib/types/response_mode';

export type AuthorizationCodeResponsePayload = {
  code: string;
  state?: string;
};

export type ImplicitOrHybridResponsePayload = {
  access_token: string;
  token_type: string;
  expires_in: number;
  code?: string;
  id_token?: string;
  state?: string;
};

export type AuthorizationResponse = {
  redirect_uri: string;
  response_mode: RESPONSE_MODE;
  payload: AuthorizationCodeResponsePayload | ImplicitOrHybridResponsePayload;
};

abstract class AuthStrategy {
  public static DEFAULT_RESPONSE_MODE = RESPONSE_MODE.QUERY;

  private _auth: AuthorizationSchema;

  protected _model: Document<AuthorizationSchema>;

  public get auth(): AuthorizationSchema {
    return this._auth;
  }

  public get model(): Document<AuthorizationSchema> {
    return this._model;
  }

  constructor(auth: AuthorizationSchema) {
    this._auth = auth;

    if (!this.validate()) {
      throw new Error('Authorization strategy validation failed!');
    }
  }

  public async create(): Promise<Document<AuthorizationSchema>> {
    this._model = await AuthorizationModel.create(this.auth);
    return this.model;
  }

  public abstract get responsePayload(): AuthorizationResponse;

  public abstract validate(): boolean;
}

export default AuthStrategy;
