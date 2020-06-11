import { NextApiRequest, NextApiResponse } from 'next';
import { LoginForm } from '~/lib/shared/types/login';

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const { email, password, session, redirect_to }: LoginForm = req.body;

  if (!email.length || !password.length) {
    throw new Error('e-mail and/or password missing!');
  }

  // TODO: check email/password using database model

  // TODO: create session cookie, if desired

  // TODO: redirect to given URL
};
