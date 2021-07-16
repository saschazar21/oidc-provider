import { IncomingMessage, ServerResponse } from 'http';
import basic from 'basic-auth';

import bodyParser from 'middleware/lib/body-parser';
import TokenError from 'utils/lib/errors/token_error';
import { ERROR_CODE } from 'utils/lib/types/error_code';
import { GRANT_TYPE } from 'utils/lib/types/grant_type';
import connection, { AuthorizationCodeModel, disconnect } from 'database/lib';
import verifyCodeChallenge from 'utils/lib/util/verify-code-challenge';

export type TokenRequestPayload = {
  grant_type: GRANT_TYPE;
  code: string;
  redirect_uri: string;
  client_id?: string;
  client_secret?: string;
  code_verifier?: string;
};

const validateAuthorization = async (
  payload: TokenRequestPayload
): Promise<boolean> => {
  const { code, client_id, client_secret, code_verifier, redirect_uri } =
    payload;

  try {
    await connection();
    const authorizationCode = await AuthorizationCodeModel.findById(
      code
    ).populate({
      path: 'authorization',
      populate: {
        path: 'client_id',
        select: '_id client_secret',
      },
    });
    const authorization = authorizationCode?.get('authorization');
    if (!authorizationCode || !authorization) {
      throw new TokenError('Invalid or expired code', ERROR_CODE.INVALID_GRANT);
    }
    if (!authorization.get('consent')) {
      throw new TokenError('Missing consent', ERROR_CODE.CONSENT_REQUIRED);
    }
    if (authorization.get('redirect_uri') !== redirect_uri) {
      throw new TokenError('Invalid redirect_uri', ERROR_CODE.INVALID_GRANT);
    }
    if (client_id !== authorization.get('client_id').get('_id')) {
      throw new TokenError('Invalid client_id', ERROR_CODE.INVALID_CLIENT);
    }
    if (!client_secret?.length && !code_verifier?.length) {
      throw new TokenError(
        'Missing client_secret or code_verifier',
        ERROR_CODE.INVALID_GRANT
      );
    }
    if (
      client_secret?.length &&
      client_secret !== authorization.get('client_id').get('client_secret')
    ) {
      throw new TokenError('Invalid client_secret', ERROR_CODE.INVALID_CLIENT);
    }
    try {
      if (
        code_verifier?.length &&
        !verifyCodeChallenge(
          authorization.get('code_challenge'),
          code_verifier,
          authorization.get('code_challenge_method')
        )
      ) {
        throw new TokenError(
          'Invalid code_verifier',
          ERROR_CODE.INVALID_CLIENT
        );
      }
    } catch (e) {
      throw e.name === TokenError.NAME
        ? e
        : new TokenError('Invalid code_verifier', ERROR_CODE.INVALID_CLIENT);
    }

    return true;
  } finally {
    await disconnect();
  }
};

const validateRequestPayload = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<TokenRequestPayload> => {
  const { name, pass } = basic(req) || {};
  const body = (await bodyParser(req, res, 'form')) as TokenRequestPayload;

  const client_id = name || body.client_id;
  const client_secret = pass || body.client_secret;

  if (!Object.values(GRANT_TYPE).includes(body.grant_type)) {
    throw new TokenError(
      `Invalid grant_type: ${body.grant_type}`,
      ERROR_CODE.UNSUPPORTED_GRANT_TYPE
    );
  }

  if (!body.code?.length) {
    throw new TokenError('Invalid or missing code', ERROR_CODE.INVALID_GRANT);
  }

  if (!body.redirect_uri?.length) {
    throw new TokenError(
      'Invalid or missing redirect_uri',
      ERROR_CODE.INVALID_GRANT
    );
  }

  if (!client_id?.length) {
    throw new TokenError(
      'Invalid or missing client_id',
      ERROR_CODE.INVALID_CLIENT
    );
  }

  const payload = Object.assign(
    {},
    body,
    {
      client_id,
    },
    client_secret?.length ? { client_secret } : {}
  );

  await validateAuthorization(payload);

  return payload;
};

export default validateRequestPayload;
