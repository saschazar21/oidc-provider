import { ENDPOINT } from '@saschazar/oidc-provider-types/lib/endpoint';
import { SCOPE } from '@saschazar/oidc-provider-types/lib/scope';
import { RESPONSE_TYPE } from '@saschazar/oidc-provider-types/lib/response_type';
import { RESPONSE_MODE } from '@saschazar/oidc-provider-types/lib/response_mode';
import { GRANT_TYPE } from '@saschazar/oidc-provider-types/lib/grant_type';
import { ACR_VALUES } from '@saschazar/oidc-provider-types/lib/acr';
import { SUBJECT_TYPE } from '@saschazar/oidc-provider-types/lib/subject_type';
import { TOKEN_ENDPOINT_AUTH_METHODS } from '@saschazar/oidc-provider-types/lib/auth_methods';
import { DISPLAY } from '@saschazar/oidc-provider-types/lib/display';
import { CLAIM } from '@saschazar/oidc-provider-types/lib/claim';

import { supportedAlgorithms } from './jwks';
import getUrl from './url';

export type OpenIDConfiguration = {
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
};

let openidConfiguration: OpenIDConfiguration;

const configuration = (
  configuration?: OpenIDConfiguration
): OpenIDConfiguration => {
  if (openidConfiguration) {
    return openidConfiguration;
  }

  openidConfiguration = configuration ?? {
    issuer: getUrl(),
    authorization_endpoint: getUrl(ENDPOINT.AUTHORIZATION),
    token_endpoint: getUrl(ENDPOINT.TOKEN),
    userinfo_endpoint: getUrl(ENDPOINT.USERINFO),
    jwks_uri: getUrl(ENDPOINT.JWKS),
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
    service_documentation: getUrl(ENDPOINT.DOCS),
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
