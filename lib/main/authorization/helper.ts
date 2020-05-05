/**
 * map to string[]
 * - scope
 * - response_type
 * - display
 * - prompt
 * - ui_locales
 * - acr_values
 */

import { AuthorizationSchema } from '~/lib/shared/db/schemata/authorization';

export const mapAuthRequest = (request: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}): AuthorizationSchema => {
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
    const arr = current.split(/\s+/);
    return Object.assign(
      {},
      {
        ...worked,
      },
      arr.length ? { [keys[idx]]: arr } : null
    );
  }, {} as { [key: string]: string[] });

  return {
    ...request,
    ...mapped,
  };
};
