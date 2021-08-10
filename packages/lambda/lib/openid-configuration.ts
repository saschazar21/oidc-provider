import serverless from 'serverless-http';

import configuration from 'middleware/endpoints/openid-configuration';

export const handler = serverless(configuration);
