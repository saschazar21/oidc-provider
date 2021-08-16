import serverless from 'serverless-http';

import jwks from '@saschazar/oidc-provider-middleware/endpoints/jwks';

export const handler = serverless(jwks);
