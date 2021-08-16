import serverless from 'serverless-http';

import authorization from '@saschazar/oidc-provider-middleware/endpoints/authorization';

export const handler = serverless(authorization);
