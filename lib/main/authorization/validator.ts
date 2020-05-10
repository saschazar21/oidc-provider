import { AuthorizationSchema } from '~/lib/shared/db/schemata/authorization';
import { SCOPE } from '~/lib/shared/types/scope';
import { RESPONSE_TYPE } from '~/lib/shared/types/response_type';

export const validateResponseType = (
  authRequest: AuthorizationSchema
): AuthorizationSchema => {
  const { response_type = [] } = authRequest;
  if (
    !Array.isArray(response_type) ||
    response_type.length !== 1 ||
    response_type[0] !== RESPONSE_TYPE.CODE
  ) {
    throw new Error(
      `ERROR: response_type parameter must equal "${RESPONSE_TYPE.CODE}"!`
    );
  }
  return authRequest;
};

export const validateScope = (
  authRequest: AuthorizationSchema
): AuthorizationSchema => {
  const { scope = [] } = authRequest;
  if (!Array.isArray(scope) || scope.indexOf(SCOPE.OPENID) < 0) {
    throw new Error(`ERROR: scope parameter must contain "${SCOPE.OPENID}"`);
  }
  return authRequest;
};
