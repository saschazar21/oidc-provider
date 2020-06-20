import { NextApiRequest, NextApiResponse } from 'next';

import connect, { UserModel } from '~/lib/shared/db';
import cookieParser from '~/lib/shared/middleware/cookies';
import redirect from '~/lib/shared/middleware/redirect';
import { LoginForm } from '~/lib/shared/types/login';

const MAX_AGE = 1000 * 60 * 60 * 24;  // 1 day

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const cookies = await cookieParser(req, res);
  const { email, password, session, redirect_to }: LoginForm = req.body;
  cookies.set('sub');

  if (!email.length || !password.length) {
    throw new Error('E-Mail and/or Password missing!');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await connect().then(() => UserModel.findOne({ email })) as any;
  if (!user || !user.comparePassword(password)) {
    throw new Error('Wrong Password given!');
  }

  // TODO: create session cookie, if desired
  cookies.set('sub', user._id, {
    expires: new Date(Date.now() + MAX_AGE),
    httpOnly: true,
    maxAge: MAX_AGE,
    sameSite: true,
    secure: true,
  });

  // TODO: redirect to given URL
  const location = redirect_to || '/';
  await redirect(req, res, { location, status: 303 });
};
