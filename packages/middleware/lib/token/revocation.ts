import { IncomingMessage, ServerResponse } from 'http';

import connection, { disconnect } from '@saschazar/oidc-provider-database/lib/';
import { AccessTokenModel } from '@saschazar/oidc-provider-database/lib/schemata/token';
import { validateIntrospectionRevocationRequestPayload } from '@saschazar/oidc-provider-middleware/lib/token/validator';
import { TOKEN_TYPE } from 'types/lib/token_type';

const revocationMiddleware = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> => {
  const tokenDoc = await validateIntrospectionRevocationRequestPayload(
    req,
    res
  );

  if (!tokenDoc) {
    return true;
  }

  try {
    await connection();
    const accessTokenDoc =
      tokenDoc.get('type') === TOKEN_TYPE.REFRESH_TOKEN &&
      (await AccessTokenModel.findOne({
        authorization: tokenDoc.get('authorization').get('_id'),
      }));

    await Promise.all([
      tokenDoc.delete(),
      accessTokenDoc && accessTokenDoc.delete(),
    ]);

    return true;
  } finally {
    await disconnect();
  }
};

export default revocationMiddleware;
