import serverless from 'serverless-http';

import userinfo from 'middleware/endpoints/userinfo';

export const handler = serverless(userinfo);
