import serverless from 'serverless-http';

import jwks from 'middleware/endpoints/jwks';

export const handler = serverless(jwks);
