import { mapAuthRequest } from '~/packages/middleware/endpoints/authorization/helper';
import { SCOPE } from 'utils/lib/types/scope';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { DISPLAY } from 'utils/lib/types/display';
import { PROMPT } from 'utils/lib/types/prompt';
import { ACR_VALUES } from 'utils/lib/types/acr';

describe('Authorization Helpers', () => {
  let authReq: { [key: string]: string };

  beforeEach(() => {
    authReq = {
      scope: `${SCOPE.OPENID} ${SCOPE.PROFILE}`,
      response_type: `${RESPONSE_TYPE.CODE}`,
      display: `${DISPLAY.PAGE}`,
      prompt: `${PROMPT.CONSENT}`,
      ui_locales: '',
      acr_values: `${ACR_VALUES.ROOT} ${ACR_VALUES.ADVANCED}`,
    };
  });

  it('should map space-delimited values to array', () => {
    const { scope, response_type, display, prompt, ui_locales, acr_values } =
      mapAuthRequest(authReq);

    expect(scope).toHaveLength(2);
    expect(response_type).toHaveLength(1);
    expect(display).toHaveLength(1);
    expect(prompt).toHaveLength(1);
    expect(ui_locales).toHaveLength(0);
    expect(acr_values).toHaveLength(2);
  });

  it('should return empty arrays when no values present', () => {
    const obj = mapAuthRequest({});

    Object.values(obj).forEach((val: string[]) => {
      expect(val).toHaveLength(0);
    });
  });
});
