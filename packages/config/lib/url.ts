import { URL } from 'url';

export const PROVIDER_URL = process.env.PROVIDER_URL || process.env.URL;

export const getUrl = (path = ''): string => {
  if (!PROVIDER_URL || !PROVIDER_URL.length) {
    throw new Error(
      'ERROR: No PROVIDER_URL env set, or no URL set by your deployment provider!'
    );
  }

  const url = new URL(path, PROVIDER_URL);
  return url.toString();
};

export default getUrl;
