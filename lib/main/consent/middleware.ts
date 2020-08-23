import { NextApiRequest, NextApiResponse } from 'next';

import connect, { UserModel, AuthorizationModel } from '~/lib/shared/db';
import cookieParser from '~/lib/shared/middleware/cookies';
import redirect from '~/lib/shared/middleware/redirect';

const IS_TEST = process.env.NODE_ENV === 'test';

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const cookies = await cookieParser(req, res);
  const { body: { consent, redirect_to } = {} } = req;
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

  await connect()
    .then(() =>
      AuthorizationModel.findByIdAndUpdate(
        authorizationId,
        { $set: { consent: true } },
        { new: true, fields: 'client_id' }
      )
    )
    .then((authorization) => {
      if (!authorization || !authorization.get('client_id')) {
        throw new Error('Updating consent on authorization failed!');
      }
      return UserModel.findByIdAndUpdate(sub, {
        $addToSet: { consents: authorization.get('client_id') },
      });
    });

  // TODO: implement cookie-based redirect_to logic
  const location = redirect_to || '/';
  return redirect(req, res, { location, status: 303 });
};
