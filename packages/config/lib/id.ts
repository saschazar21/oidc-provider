export const ALPHABET =
  '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

export enum ALPHABET_LENGTH {
  CLIENT_SECRET = 64, // 512 bits, suitable for HS512 signing
  DEFAULT = 18,
  LONG = 36,
  SHORT = 10,
}
