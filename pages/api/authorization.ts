import { NextApiRequest, NextApiResponse } from 'next';

import AuthorizationModel, {
  AuthorizationSchema,
} from '~/lib/shared/db/schemata/authorization';
import cookieParser from '~/lib/shared/middleware/cookies';
import methods from '~/lib/shared/middleware/methods';
import redirect from '~/lib/shared/middleware/redirect';
import { METHOD } from '~/lib/shared/types/method';
import logError from '~/lib/shared/util/log_error';

// TODO: move to a general config space;
const MAX_AGE = 1000 * 60 * 5; // 5 minutes between login & authorization

export default async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!(await methods(req, res, [METHOD.GET, METHOD.POST]))) {
    return res.end();
  }

  if (req.method !== METHOD.GET && req.method !== METHOD.POST) {
    res.status(204);
    return res.end();
  }

  const cookies = await cookieParser(req, res);
  const authRequest: {
    email?: string;
    password?: string;
  } & AuthorizationSchema = req.method === METHOD.POST ? req.body : req.query;

  if (!cookies.get('authorization')) {
    try {
      const authorization = await AuthorizationModel.create(authRequest);
      cookies.set('authorization', authorization.get('_id'), {
        expires: new Date(Date.now() + MAX_AGE),
        httpOnly: true,
        maxAge: MAX_AGE,
        sameSite: true,
        secure: true,
      });
    } catch (e) {
      const { method, url: path } = req;
      res.status(500);
      res.end();
      return logError({
        message: e.message || e,
        method,
        path,
        statusCode: 500,
      });
    }
  }

  if (!cookies.get('user') && !(authRequest.email && authRequest.password)) {
    const status = req.method === METHOD.POST ? 303 : 307;
    return redirect(req, res, { location: '/login', status });
  }
};
