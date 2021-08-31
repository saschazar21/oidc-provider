import AuthStrategy, {
  AuthorizationResponse,
} from '@saschazar/oidc-provider-middleware/strategies/AuthStrategy';
import AuthorizationError from '@saschazar/oidc-provider-utils/lib/errors/authorization_error';
import { ERROR_CODE } from '@saschazar/oidc-provider-types/lib/error_code';
import { RESPONSE_MODE } from '@saschazar/oidc-provider-types/lib/response_mode';
import { RESPONSE_TYPE } from '@saschazar/oidc-provider-types/lib/response_type';

export type ImplicitResponsePayload = {
  access_token?: string;
  expires_in?: number;
  id_token: string;
  state?: string;
  token_type?: 'Bearer';
};

class ImplicitStrategy extends AuthStrategy<ImplicitResponsePayload> {
  public static readonly DEFAULT_RESPONSE_MODE = RESPONSE_MODE.FRAGMENT;

  protected async prevalidate(): Promise<boolean> {
    if (!this.auth.nonce) {
      throw new AuthorizationError(
        'Nonce is required!',
        ERROR_CODE.INVALID_REQUEST,
        this.auth.redirect_uri,
        this.auth.state
      );
    }

    return super.prevalidate();
  }

  public async responsePayload(): Promise<
    AuthorizationResponse<ImplicitResponsePayload>
  > {
    await this.validate();

    const response_type: RESPONSE_TYPE[] = this.doc.get('response_type');
    const accessTokenModel =
      response_type.includes(RESPONSE_TYPE.TOKEN) &&
      (await this.createAccessToken());
    const expires_in =
      accessTokenModel &&
      accessTokenModel.get('expires_at') &&
      Math.floor((accessTokenModel.get('expires_at') - Date.now()) * 0.001);
    const idToken = await this.createIdToken();

    const payload = Object.assign(
      {},
      {
        id_token: idToken,
      },
      expires_in > 0 && accessTokenModel
        ? {
            access_token: accessTokenModel.get('_id'),
            expires_in,
            token_type: 'Bearer',
          }
        : null,
      this.doc.get('state') ? { state: this.doc.get('state') } : null
    ) as ImplicitResponsePayload;

    return {
      redirect_uri: this.doc.get('redirect_uri'),
      response_mode:
        this.doc.get('response_mode') ?? ImplicitStrategy.DEFAULT_RESPONSE_MODE,
      payload,
    };
  }
}

export default ImplicitStrategy;
