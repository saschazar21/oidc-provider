export enum LIFETIME {
  AUTHORIZATION_CODE = 60 * 10, // 10 minutes
  ACCESS_TOKEN = 60 * 15, // 15 minutes
  REFRESH_TOKEN = 60 * 60 * 24 * 30, // 30 days
}
