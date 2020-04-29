import { supportedAlgorithms } from '~/lib/shared/config/jwks';
import getUrl from '~/lib/shared/config/url';
import { SCOPE } from '~/lib/shared/types/scope';
import { RESPONSE_TYPE } from '~/lib/shared/types/response_type';
import { RESPONSE_MODE } from '~/lib/shared/types/response_mode';
import { GRANT_TYPE } from '~/lib/shared/types/grant_type';
import { ACR_VALUES } from '~/lib/shared/types/acr';
import { SUBJECT_TYPE } from '~/lib/shared/types/subject_type';
import { TOKEN_ENDPOINT_AUTH_METHODS } from '~/lib/shared/types/auth_methods';
import { DISPLAY } from '~/lib/shared/types/display';
import { CLAIM } from '~/lib/shared/types/claim';

export interface OpenIDConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  acr_values_supported?: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  id_token_encryption_alg_values_supported?: string[];
  id_token_encryption_enc_values_supported?: string[];
  userinfo_signing_alg_values_supported?: string[];
  userinfo_encryption_alg_values_supported?: string[];
  userinfo_encryption_enc_values_supported?: string[];
  request_object_signing_alg_values_supported?: string[];
  request_object_encryption_alg_values_supported?: string[];
  request_object_encryption_enc_values_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  display_values_supported?: string[];
  claim_types_supported?: string[];
  claims_supported?: string[];
  service_documentation?: string;
  claims_locales_supported?: string[];
  ui_locales_supported?: string[];
  claims_parameter_supported?: boolean;
  request_parameter_supported?: boolean;
  request_uri_parameter_supported?: boolean;
  require_request_uri_registration?: boolean;
  op_policy_uri?: string;
  op_tos_uri?: string;
}

let openidConfiguration: OpenIDConfiguration;

const configuration = (): OpenIDConfiguration => {
  if (openidConfiguration) {
    return openidConfiguration;
  }

  openidConfiguration = {
    issuer: getUrl(),
    authorization_endpoint: getUrl('/api/authorization'),
    token_endpoint: getUrl('/api/token'),
    userinfo_endpoint: getUrl('/api/userinfo'),
    jwks_uri: getUrl('/api/jwks'),
    // registration_endpoint?: string;
    scopes_supported: Object.values(SCOPE),
    response_types_supported: Object.values(RESPONSE_TYPE),
    response_modes_supported: Object.values(RESPONSE_MODE),
    grant_types_supported: Object.values(GRANT_TYPE),
    acr_values_supported: Object.values(ACR_VALUES),
    subject_types_supported: Object.values(SUBJECT_TYPE),
    id_token_signing_alg_values_supported: supportedAlgorithms('JWS'),
    id_token_encryption_alg_values_supported: supportedAlgorithms('JWE'),
    // id_token_encryption_enc_values_supported: string;
    // userinfo_signing_alg_values_supported: string;
    // userinfo_encryption_alg_values_supported: string;
    // userinfo_encryption_enc_values_supported: string;
    // request_object_signing_alg_values_supported: string;
    // request_object_encryption_alg_values_supported: string;
    // request_object_encryption_enc_values_supported: string;
    token_endpoint_auth_methods_supported: Object.values(
      TOKEN_ENDPOINT_AUTH_METHODS
    ),
    // token_endpoint_auth_signing_alg_values_supported: string;
    display_values_supported: Object.values(DISPLAY),
    // claim_types_supported: string;
    claims_supported: Object.values(CLAIM),
    service_documentation: getUrl('/docs'),
    // claims_locales_supported: string;
    // ui_locales_supported: string;
    // claims_parameter_supported: string;
    // request_parameter_supported: string;
    // request_uri_parameter_supported: string;
    // require_request_uri_registration: string;
    // op_policy_uri: string;
    // op_tos_uri: string;
  };

  return openidConfiguration;
};

export default configuration;
