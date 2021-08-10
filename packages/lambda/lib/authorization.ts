import serverless from 'serverless-http';

import authorization from 'middleware/endpoints/authorization';

export const handler = serverless(authorization);
