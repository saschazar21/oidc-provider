export const ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS?.split(',').map((origin: string) =>
    origin.trim().replace(/\/$/, '')
  ) ?? [];
