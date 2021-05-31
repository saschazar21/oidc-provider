export enum LOGIN_FORM {
  EMAIL = 'email',
  PASSWORD = 'password',
  SESSION = 'session',
  REDIRECT = 'redirect_to',
}

export interface LoginForm {
  email?: string;
  password?: string;
  session?: boolean;
  redirect_to?: string;
}
