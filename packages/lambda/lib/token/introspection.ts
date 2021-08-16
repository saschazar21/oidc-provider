import serverless from 'serverless-http';

import introspection from '@saschazar/oidc-provider-middleware/endpoints/token/introspection';

export const handler = serverless(introspection);
