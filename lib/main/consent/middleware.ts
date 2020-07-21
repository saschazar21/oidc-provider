import { NextApiRequest, NextApiResponse } from 'next';

import connect, { UserModel } from '~/lib/shared/db';
import cookieParser from '~/lib/shared/middleware/cookies';

const IS_TEST = process.env.NODE_ENV === 'test';

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const cookies = await cookieParser(req, res);
  const { body: { consent } = {} } = req;
  const authorizationId = cookies.get('authorization', { signed: !IS_TEST });
  const sub =
    cookies.get('user', { signed: !IS_TEST }) ||
    cookies.get('sub', { signed: !IS_TEST });

  if (!sub?.length) {
    throw new Error('User not logged in!');
  }

  if (!authorizationId) {
    throw new Error('No authorization found!');
  }

  if (!consent) {
    throw new Error('No consent was given!');
  }

  await connect().then(() =>
    UserModel.findByIdAndUpdate(sub, {
      $addToSet: { consents: authorizationId },
    })
  );

  // TODO: implement cookie-based redirect_to logic
};
