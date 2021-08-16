import serverless from 'serverless-http';

import userinfo from '@saschazar/oidc-provider-middleware/endpoints/userinfo';

export const handler = serverless(userinfo);
