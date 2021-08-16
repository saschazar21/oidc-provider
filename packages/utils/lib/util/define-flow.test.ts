import defineFlow from 'utils/lib/util/define-flow';
import { AUTHENTICATION_FLOW, RESPONSE_TYPE } from 'types/lib/response_type';

describe('Define Flow', () => {
  it('detects Authorization Code Flow', () => {
    const response_type = ['code'] as RESPONSE_TYPE[];

    expect(defineFlow(response_type)).toEqual(
      AUTHENTICATION_FLOW.AUTHORIZATION_CODE
    );
  });
  it('detects Implicit Flow', () => {
    const response_type = ['id_token', 'token'] as RESPONSE_TYPE[];

    expect(defineFlow(response_type)).toEqual(AUTHENTICATION_FLOW.IMPLICIT);
  });
  it('detects Hybrid Flow', () => {
    const response_type = ['code', 'token'] as RESPONSE_TYPE[];

    expect(defineFlow(response_type)).toEqual(AUTHENTICATION_FLOW.HYBRID);
  });
  it('fails to detect invalid flow', () => {
    const response_type = ['cod', 'token'] as RESPONSE_TYPE[];

    expect(defineFlow(response_type)).toEqual(null);
  });
  it('fails to detect flow from unorderd response types', () => {
    const response_type = ['token', 'code'] as RESPONSE_TYPE[];

    expect(defineFlow(response_type)).toEqual(null);
  });
});
