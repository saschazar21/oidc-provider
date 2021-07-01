import AuthStrategy, {
  AuthorizationResponse,
} from 'middleware/strategies/AuthStrategy';

export type AuthorizationCodeResponsePayload = {
  code: string;
  state?: string;
};

class AuthorizationCodeStrategy extends AuthStrategy<AuthorizationCodeResponsePayload> {
  public async responsePayload(): Promise<
    AuthorizationResponse<AuthorizationCodeResponsePayload>
  > {
    await this.validate();

    const payload = Object.assign(
      {},
      {
        code: this.id,
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
