import AuthStrategy, {
  AuthorizationResponse,
} from '@saschazar/oidc-provider-middleware/strategies/AuthStrategy';

export type AuthorizationCodeResponsePayload = {
  code: string;
  state?: string;
};

class AuthorizationCodeStrategy extends AuthStrategy<AuthorizationCodeResponsePayload> {
  public async responsePayload(): Promise<
    AuthorizationResponse<AuthorizationCodeResponsePayload>
  > {
    await this.validate();

    const code = await this.createAuthorizationCode();

    const payload = Object.assign(
      {},
      {
        code: code.get('_id'),
      },
      this.doc.get('state') ? { state: this.doc.get('state') } : null
    ) as AuthorizationCodeResponsePayload;

    return {
      redirect_uri: this.doc.get('redirect_uri'),
      response_mode:
        this.doc.get('response_mode') ??
        AuthorizationCodeStrategy.DEFAULT_RESPONSE_MODE,
      payload,
    };
  }
}

export default AuthorizationCodeStrategy;
