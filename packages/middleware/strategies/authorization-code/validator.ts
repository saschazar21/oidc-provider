import { AuthorizationSchema } from 'database/lib/schemata/authorization';
import { AUTHENTICATION_FLOW } from 'utils/lib/types/response_type';
import defineFlow from 'utils/lib/util/define-flow';

const validateAuthorizationCode = (auth: AuthorizationSchema): boolean => {
  const { response_type } = auth;
  return defineFlow(response_type) === AUTHENTICATION_FLOW.AUTHORIZATION_CODE;
};

export default validateAuthorizationCode;
