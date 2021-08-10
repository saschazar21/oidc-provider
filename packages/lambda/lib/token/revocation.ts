import serverless from 'serverless-http';

import revocation from 'middleware/endpoints/token/revocation';

export const handler = serverless(revocation);
