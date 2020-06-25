import { NextApiRequest, NextApiResponse } from 'next';

import connect, { UserModel } from '~/lib/shared/db';
import cookieParser from '~/lib/shared/middleware/cookies';
import redirect from '~/lib/shared/middleware/redirect';
import { LoginForm } from '~/lib/shared/types/login';

const MAX_AGE = {
  sub: 1000 * 60 * 5, // 5 minutes, only for authorization, no session is persisted
  user: 1000 * 60 * 60 * 24 * 30, // 30 days, when session was selected
};

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const cookies = await cookieParser(req, res);
  const { email, password, session, redirect_to }: LoginForm = req.body;
  const key = session ? 'user' : 'sub';
  cookies.set('sub');

  if (!email.length || !password.length) {
    throw new Error('E-Mail and/or Password missing!');
  }

  const user = (await connect().then(
    () => UserModel.findOne({ email })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  )) as any;
  if (!user || !user.comparePassword(password)) {
    throw new Error('Wrong Password given!');
  }

  // TODO: create session cookie, if desired
  cookies.set(key, user._id, {
    expires: new Date(Date.now() + MAX_AGE[key]),
    httpOnly: true,
    maxAge: MAX_AGE[key],
    sameSite: true,
    secure: true,
  });

  // TODO: redirect to given URL
  const location = redirect_to || '/';
  await redirect(req, res, { location, status: 303 });
};
