export interface JWKSConfig {
  kty: 'EC' | 'RSA' | 'OKT' | 'oct';
  size: string | number;
  options: {
    alg?: string;
    use: 'enc' | 'sig';
  };
}

// required/recommended algorithms for JWS
// https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40#section-3.1
export const JWS: JWKSConfig[] = [
  { kty: 'EC', size: 'P-256', options: { alg: 'ES256', use: 'sig' } },
  { kty: 'RSA', size: 2048, options: { alg: 'RS256', use: 'sig' } },
  { kty: 'oct', size: 256, options: { alg: 'HS256', use: 'sig' } },
];

// recommended+ algorithms for JWE
// https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40#section-4.1
export const JWE: JWKSConfig[] = [
  { kty: 'RSA', size: 2048, options: { alg: 'RSA-OAEP', use: 'enc' } },
  { kty: 'EC', size: 'P-256', options: { alg: 'ECDH-ES', use: 'enc' } },
];

export const JWKS: JWKSConfig[] = [].concat(...JWS, ...JWE);

export default JWKS;
