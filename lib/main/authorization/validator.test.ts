import {
  validateScope,
  validateResponseType,
} from '~/lib/main/authorization/validator';
import { AuthorizationSchema } from '~/lib/shared/db/schemata/authorization';
import { SCOPE } from '~/lib/shared/types/scope';
import { RESPONSE_TYPE } from '~/lib/shared/types/response_type';

describe('Authorization Validators', () => {
  let authReq: AuthorizationSchema;

  beforeEach(() => {
    authReq = {
      scope: [SCOPE.OPENID, SCOPE.PROFILE],
      response_type: [RESPONSE_TYPE.CODE],
      client_id: 'some client ID',
      redirect_uri: 'https://some.redirect.uri',
    };
  });

  it('validates scope value', () => {
    expect(validateScope(authReq)).toEqual(authReq);
  });

  it('validates response_type value', () => {
    expect(validateResponseType(authReq)).toEqual(authReq);
  });

  it('should throw when no scope is given', () => {
    const req = {
      ...authReq,
      scope: null,
    };

    expect(() => validateScope(req)).toThrowError();
  });

  it('should throw when no response_type is given', () => {
    const req = {
      ...authReq,
      response_type: null,
    };

    expect(() => validateResponseType(req)).toThrowError();
  });

  it('should throw when undefined scope is given', () => {
    const req = {
      ...authReq,
      scope: undefined,
    };

    expect(() => validateScope(req)).toThrowError();
  });

  it('should throw when undefined response_type is given', () => {
    const req = {
      ...authReq,
      response_type: undefined,
    };

    expect(() => validateResponseType(req)).toThrowError();
  });

  it('should throw when invalid scope value is given', () => {
    const req = {
      ...authReq,
      scope: [SCOPE.PROFILE],
    };

    expect(() => validateScope(req)).toThrowError();
  });

  it('should throw when invalid response_type is given', () => {
    const req = {
      ...authReq,
      response_type: [RESPONSE_TYPE.TOKEN],
    };

    expect(() => validateResponseType(req)).toThrowError();
  });
});
