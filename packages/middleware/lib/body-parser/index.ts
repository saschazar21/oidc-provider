import { IncomingMessage, ServerResponse } from 'http';

export type ParseType = 'form' | 'json' | 'text';
export type Body = { [key: string]: unknown } | string;

const regexes = new Map<string, RegExp>([
  ['json', /^application\/json/i],
  ['form', /^application\/x-www-form-urlencoded/i],
  ['text', /^text\//i],
]);

const parseType = (req: IncomingMessage): ParseType => {
  const { headers: { ['content-type']: contentType } = {} } = req;

  if (contentType?.length) {
    for (const [t, regex] of regexes.entries()) {
      if (regex.test(contentType)) {
        return t as ParseType;
      }
    }
  }

  return 'text';
};

const bodyParser = async (
  req: IncomingMessage,
  res: ServerResponse,
  type?: ParseType
): Promise<Body> => {
  let parser: (
    req: IncomingMessage,
    res: ServerResponse,
    cb: (err: Error, body: string | unknown) => void
  ) => void;
  const t = type ?? parseType(req);

  switch (t) {
    case 'form':
      parser = await (await import('body/form')).default;
      break;
    case 'json':
      parser = await (await import('body/json')).default;
      break;
    case 'text':
    default:
      parser = await (await import('body')).default;
      break;
  }

  return new Promise((resolve, reject) =>
    parser(req, res, (err, body) => (err ? reject(err) : resolve(body as Body)))
  );
};

export default bodyParser;
