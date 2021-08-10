import serverless from 'serverless-http';

import login from 'middleware/endpoints/login';

export const handler = serverless(login);
