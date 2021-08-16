import { ResponsePayload } from '@saschazar/oidc-provider-middleware/lib/authorization/helper';
import { AuthorizationResponse } from '@saschazar/oidc-provider-middleware/strategies/AuthStrategy';

const assembleInputFields = (payload: ResponsePayload): string =>
  Object.keys(payload).reduce(
    (tpl: string, key: string) =>
      `${tpl}<input type="hidden" name="${key}" value="${payload[key]}" />`,
    ''
  );

const generateHTML = ({
  redirect_uri,
  payload,
}: AuthorizationResponse<ResponsePayload>): string => `
<!DOCTYPE html>
<html>
  <head>
    <title>Submit this HTML form</title>
  </head>
  <body onload="javascript:document.forms[0].submit()">
    <form method="post" action="${redirect_uri}">
      ${assembleInputFields(payload)}
    </form>
  </body>
</html>
`;

export default generateHTML;
