import serverless from 'serverless-http';

import token from '@saschazar/oidc-provider-middleware/endpoints/token';

export const handler = serverless(token);
