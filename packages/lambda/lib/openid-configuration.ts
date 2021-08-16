import serverless from 'serverless-http';

import configuration from '@saschazar/oidc-provider-middleware/endpoints/openid-configuration';

export const handler = serverless(configuration);
