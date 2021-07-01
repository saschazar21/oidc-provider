import AuthStrategy, {
  AuthorizationResponse,
} from 'middleware/strategies/AuthStrategy';
import { RESPONSE_MODE } from 'utils/lib/types/response_mode';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';

export type HybridResponsePayload = {
  access_token?: string;
  code: string;
  token_type?: string;
  expires_in?: number;
  id_token?: string;
  state?: string;
};

class HybridStrategy extends AuthStrategy<HybridResponsePayload> {
  public static readonly DEFAULT_RESPONSE_MODE = RESPONSE_MODE.FRAGMENT;

  protected async validate(): Promise<boolean> {
    if (
      Array.isArray(this.auth.response_type) &&
      this.auth.response_type.includes[RESPONSE_TYPE.ID_TOKEN] &&
      !this.auth.nonce
    ) {
      throw new Error(
        `Nonce is required, when response_type=${RESPONSE_TYPE.ID_TOKEN}!`
      );
    }

    return super.validate();
  }

  public async responsePayload(): Promise<
    AuthorizationResponse<HybridResponsePayload>
  > {
    await this.validate();

    const response_type: RESPONSE_TYPE[] = this.doc.get('response_type');
    const accessTokenModel =
      response_type.includes(RESPONSE_TYPE.TOKEN) &&
      (await this.createAccessToken());
    const expires_in =
      accessTokenModel &&
      accessTokenModel.get('expiresAt') &&
      Math.floor((accessTokenModel.get('expiresAt') - Date.now()) * 0.001);

    const payload = Object.assign(
      {},
      {
        code: this.id,
      },
      expires_in > 0 && accessTokenModel
        ? {
            access_token: accessTokenModel._id,
            expires_in,
            token_type: 'Bearer',
          }
        : null,
      this.doc.get('state') ? { state: this.doc.get('state') } : null
    ) as HybridResponsePayload;

    return {
      redirect_uri: this.doc.get('redirect_uri'),
      response_mode:
        this.doc.get('response_mode') ?? HybridStrategy.DEFAULT_RESPONSE_MODE,
      payload,
    };
  }
}

export default HybridStrategy;
