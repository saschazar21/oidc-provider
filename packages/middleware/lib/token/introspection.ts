import { IncomingMessage, ServerResponse } from 'http';

import { getUrl } from 'config/lib/url';
import { validateIntrospectionRevocationRequestPayload } from 'middleware/lib/token/validator';
import { TOKEN_TYPE } from 'utils/lib/types/token_type';

// const BEARER_REGEX = /^bearer\s/i;

export type IntrospectionResponsePayload = {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: 'Bearer';
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  jti?: string;
};

const introspectionMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<IntrospectionResponsePayload> => {
  // TODO: add Bearer authorization mechanism as described in https://datatracker.ietf.org/doc/html/rfc7662#section-2.1
  const tokenDoc = await validateIntrospectionRevocationRequestPayload(
    req,
    res
  );

  if (
    !tokenDoc ||
    !tokenDoc.get('active') ||
    tokenDoc.get('type') !== TOKEN_TYPE.ACCESS_TOKEN
  ) {
    return { active: false };
  }

  const authorization = tokenDoc.get('authorization');
  const client = authorization.get('client_id');
  const user = authorization.get('user');

  const scope = authorization.get('scope')?.join(' ');
  const exp = Math.floor(tokenDoc.get('expires_at').valueOf() * 0.001);
  const iat = Math.floor(tokenDoc.get('created_at').valueOf() * 0.001);

  return {
    active: true,
    aud: client.get('_id'),
    client_id: client.get('_id'),
    exp,
    iat,
    iss: getUrl(),
    scope,
    sub: user.get('_id'),
    token_type: 'Bearer',
    username: user.get('email'),
  };
};

export default introspectionMiddleware;
