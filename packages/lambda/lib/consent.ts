import serverless from 'serverless-http';

import consent from 'middleware/endpoints/consent';

export const handler = serverless(consent);
