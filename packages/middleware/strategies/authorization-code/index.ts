import AuthStrategy, {
  AuthorizationResponse,
  AuthorizationCodeResponsePayload,
} from 'middleware/strategies/AuthStrategy';
import validateAuthorizationCode from 'middleware/strategies/authorization-code/validator';

class AuthorizationCodeStrategy extends AuthStrategy {
  public get responsePayload(): AuthorizationResponse {
    if (!this.model) {
      throw new Error('No Authorization Model created yet!');
    }

    const payload = Object.assign(
      {},
      {
        code: this.model._id,
      },
      this.model.get('state') ? { state: this.model.get('state') } : null
    ) as AuthorizationCodeResponsePayload;

    return {
      redirect_uri: this.model.get('redirect_uri'),
      response_mode:
        this.model.get('response_mode') ??
        AuthorizationCodeStrategy.DEFAULT_RESPONSE_MODE,
      payload,
    } as AuthorizationResponse;
  }

  public validate(): boolean {
    return validateAuthorizationCode(this.auth);
  }
}

export default AuthorizationCodeStrategy;
