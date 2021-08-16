import serverless from 'serverless-http';

import consent from '@saschazar/oidc-provider-middleware/endpoints/consent';

export const handler = serverless(consent);
