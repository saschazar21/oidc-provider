import serverless from 'serverless-http';

import token from 'middleware/endpoints/token';

export const handler = serverless(token);
