export enum ENDPOINT {
  AUTHORIZATION = '/api/authorization',
  CONSENT = '/api/consent',
  DOCS = '/docs',
  JWKS = '/api/jwks',
  LOGIN = '/api/login',
  OPENID_CONFIGURATION = '/.well-known/openid-configuration',
  TOKEN = '/api/token',
  TOKEN_INTROSPECTION = '/api/token/introspect',
  TOKEN_REVOCATION = '/api/token/revoke',
  USERINFO = '/api/userinfo',
}

export enum CLIENT_ENDPOINT {
  CONSENT = '/consent',
  LOGIN = '/login',
}
