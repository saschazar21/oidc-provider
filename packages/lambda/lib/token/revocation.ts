import serverless from 'serverless-http';

import revocation from '@saschazar/oidc-provider-middleware/endpoints/token/revocation';

export const handler = serverless(revocation);
