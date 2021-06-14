import MockReq from 'mock-req';
import MockRes from 'mock-res';

import bodyParser from 'middleware/lib/body-parser';
import { METHOD } from 'utils/lib/types/method';

describe('BodyParser', () => {
  const res = new MockRes({});

  it('parses text-encoded body', async () => {
    const BODY = 'Hello, World!';

    const req = new MockReq({
      headers: {
        'Content-Type': 'text/html',
      },
      method: METHOD.POST,
    });
    req.write(BODY);
    req.end();

    await expect(bodyParser(req, res)).resolves.toEqual(BODY);
  });

  it('parses JSON-encoded body', async () => {
    const BODY = { hello: 'world' };

    const req = new MockReq({
      headers: {
        'Content-Type': 'application/json',
      },
      method: METHOD.POST,
    });
    req.write(BODY);
    req.end();

    await expect(bodyParser(req, res)).resolves.toMatchObject(BODY);
  });

  it('parses a form-encoded body', async () => {
    const BODY = 'hello=world&env=test';

    const req = new MockReq({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: METHOD.POST,
    });
    req.write(BODY);
    req.end();

    await expect(bodyParser(req, res)).resolves.toMatchObject({
      hello: 'world',
      env: 'test',
    });
  });

  it('parses a JSON-encoded body using a hint', async () => {
    const BODY = { hello: 'world' };

    const req = new MockReq({
      headers: {
        'Content-Type': 'application/json',
      },
      method: METHOD.POST,
    });
    req.write(BODY);
    req.end();

    await expect(bodyParser(req, res, 'json')).resolves.toMatchObject(BODY);
  });

  it('falls back to text-encoded body', async () => {
    const BODY = { hello: 'world' };

    const req = new MockReq({
      method: METHOD.POST,
    });
    req.write(BODY);
    req.end();

    await expect(bodyParser(req, res)).resolves.toEqual(JSON.stringify(BODY));
  });
});
