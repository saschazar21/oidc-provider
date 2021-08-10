import serverless from 'serverless-http';

import introspection from 'middleware/endpoints/token/introspection';

export const handler = serverless(introspection);
