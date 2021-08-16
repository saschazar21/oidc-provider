import serverless from 'serverless-http';

import login from '@saschazar/oidc-provider-middleware/endpoints/login';

export const handler = serverless(login);
