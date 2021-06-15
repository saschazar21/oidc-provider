import { IncomingMessage, ServerResponse } from 'http';
import URL from 'url';

import { Authorization } from 'database/lib/schemata/authorization';
import bodyParser from 'middleware/lib/body-parser';
import { METHOD } from 'utils/lib/types/method';

/**
 * map to string[]
 * - scope
 * - response_type
 * - display
 * - prompt
 * - ui_locales
 * - acr_values
 */
export type AuthorizationPayload = {
  scope?: string;
  response_type?: string;
  display?: string;
  prompt?: string;
  ui_locales?: string;
  acr_values?: string;
};

export const mapAuthRequest = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<Authorization> => {
  const request: AuthorizationPayload =
    req.method === METHOD.POST
      ? ((await bodyParser(req, res, 'form')) as AuthorizationPayload)
      : URL.parse(req.url, true).query;

  const {
    scope = '',
    response_type = '',
    display = '',
    prompt = '',
    ui_locales = '',
    acr_values = '',
  } = request;

  const obj = { scope, response_type, display, prompt, ui_locales, acr_values };
  const keys = Object.keys(obj);
  const values = Object.values(obj);
  const mapped = values.reduce((worked, current, idx) => {
    const arr = current.split(/\s+/).filter((val: string) => val.length);
    return Object.assign(
      {},
      {
        ...worked,
      },
      arr.length ? { [keys[idx]]: arr } : null
    );
  }, {} as Authorization);

  return {
    ...request,
    ...mapped,
  } as Authorization;
};
