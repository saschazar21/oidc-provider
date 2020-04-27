export const PROVIDER_URL = process.env.PROVIDER_URL || process.env.VERCEL_URL;

export const getUrl = (): string => {
  if (!PROVIDER_URL || !PROVIDER_URL.length) {
    throw new Error(
      'ERROR: No PROVIDER_URL env set, or no Vercel Deployment detected!'
    );
  }

  return PROVIDER_URL;
};

export default getUrl;
