import MockRequest from 'mock-req';
import { encode } from 'querystring';

import { mapAuthRequest } from 'middleware/lib/authorization/helper';
import { ENDPOINT } from 'utils/lib/types/endpoint';
import { SCOPE } from 'utils/lib/types/scope';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { DISPLAY } from 'utils/lib/types/display';
import { METHOD } from 'utils/lib/types/method';
import { PROMPT } from 'utils/lib/types/prompt';
import { ACR_VALUES } from 'utils/lib/types/acr';
import { mockResponse } from 'utils/lib/util/test-utils';

describe('Authorization Helpers', () => {
  let req;
  let res;

  const query = {
    scope: `${SCOPE.OPENID} ${SCOPE.PROFILE}`,
    response_type: `${RESPONSE_TYPE.CODE}`,
    display: `${DISPLAY.PAGE}`,
    prompt: `${PROMPT.CONSENT}`,
    ui_locales: '',
    acr_values: `${ACR_VALUES.ROOT} ${ACR_VALUES.ADVANCED}`,
  };

  beforeEach(() => {
    req = new MockRequest({
      method: METHOD.GET,
      url: `${ENDPOINT.AUTHORIZATION}?${encode(query)}`,
    });

    res = mockResponse();
  });

  it('should map space-delimited values to array', async () => {
    const { scope, response_type, display, prompt, ui_locales, acr_values } =
      await mapAuthRequest(req, res);

    expect(scope).toHaveLength(2);
    expect(response_type).toHaveLength(1);
    expect(display).toHaveLength(1);
    expect(prompt).toHaveLength(1);
    expect(ui_locales).toHaveLength(0);
    expect(acr_values).toHaveLength(2);
  });

  it('should map POST body to JavaScript object', async () => {
    const updatedReq = new MockRequest({
      method: METHOD.POST,
      url: ENDPOINT.AUTHORIZATION,
    });
    updatedReq.write(encode(query));
    updatedReq.end();

    const { scope, response_type, display, prompt, ui_locales, acr_values } =
      await mapAuthRequest(updatedReq, res);

    expect(scope).toHaveLength(2);
    expect(response_type).toHaveLength(1);
    expect(display).toHaveLength(1);
    expect(prompt).toHaveLength(1);
    expect(ui_locales).toHaveLength(0);
    expect(acr_values).toHaveLength(2);
  });

  it('should return empty arrays when no values present', () => {
    const obj = mapAuthRequest(new MockRequest(), res);

    Object.values(obj).forEach((val: string[]) => {
      expect(val).toHaveLength(0);
    });
  });
});
