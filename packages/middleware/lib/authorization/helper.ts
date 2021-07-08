import { IncomingMessage, ServerResponse } from 'http';
import URL from 'url';

import connection, { disconnect } from 'database/lib/connect';
import AuthorizationModel, {
  AuthorizationSchema,
} from 'database/lib/schemata/authorization';
import AuthorizationCodeStrategy, {
  AuthorizationCodeResponsePayload,
} from 'middleware/strategies/authorization-code';
import AuthStrategy from 'middleware/strategies/AuthStrategy';
import ImplicitStrategy, {
  ImplicitResponsePayload,
} from 'middleware/strategies/implicit';
import HybridStrategy, {
  HybridResponsePayload,
} from 'middleware/strategies/hybrid';
import bodyParser from 'middleware/lib/body-parser';
import { METHOD } from 'utils/lib/types/method';
import { AUTHENTICATION_FLOW } from 'utils/lib/types/response_type';
import defineFlow from 'utils/lib/util/define-flow';

/**
 * map to string[]
 * - scope
 * - response_type
 * - display
 * - prompt
 * - ui_locales
 * - acr_values
 */
export type AuthorizationPayload = AuthorizationSchema & {
  scope?: string;
  response_type?: string;
  display?: string;
  prompt?: string;
  ui_locales?: string;
  acr_values?: string;
};

export type ResponsePayload =
  | AuthorizationCodeResponsePayload
  | ImplicitResponsePayload
  | HybridResponsePayload;

export const buildAuthorizationSchema = async (
  auth: AuthorizationSchema
): Promise<AuthorizationSchema> => {
  try {
    await connection();
    if (!auth._id) {
      return auth;
    }
    const authorization = await AuthorizationModel.findById(
      auth._id,
      'redirect_uri response_type scope nonce state client_id user'
    );
    if (!authorization) {
      throw new Error(`ERROR: No Authorization found with ID: ${auth._id}!`);
    }
    return {
      ...authorization.toJSON(),
      ...auth,
    };
  } finally {
    await disconnect();
  }
};

export const getAuthenticationFlow = (
  auth: AuthorizationSchema
): AuthStrategy<ResponsePayload> => {
  const flow = defineFlow(auth.response_type);
  switch (flow) {
    case AUTHENTICATION_FLOW.AUTHORIZATION_CODE:
      return new AuthorizationCodeStrategy(auth);
    case AUTHENTICATION_FLOW.IMPLICIT:
      return new ImplicitStrategy(auth);
    case AUTHENTICATION_FLOW.HYBRID:
      return new HybridStrategy(auth);
    default:
      throw new Error(
        'ERROR: Could not determine authorization flow! response_type missing or invalid?'
      );
  }
};

export const mapAuthRequest = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<AuthorizationSchema> => {
  const request: AuthorizationPayload =
    req.method === METHOD.POST
      ? ((await bodyParser(req, res, 'form')) as AuthorizationPayload)
      : (URL.parse(req.url, true).query as unknown as AuthorizationPayload);

  const {
    scope = '',
    response_type = '',
    display = '',
    prompt = '',
    ui_locales = '',
    acr_values = '',
  } = request;

  const obj = { scope, response_type, display, prompt, ui_locales, acr_values };
  const keys = Object.keys(obj);
  const values = Object.values(obj);
  const mapped = values.reduce((worked, current, idx) => {
    const arr = current.split(/\s+/).filter((val: string) => val.length);
    return Object.assign(
      {},
      {
        ...worked,
      },
      arr.length ? { [keys[idx]]: arr } : null
    );
  }, {} as AuthorizationSchema);

  return {
    ...request,
    ...mapped,
  } as AuthorizationSchema;
};
