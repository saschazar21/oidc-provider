import { Document } from 'mongoose';

import {
  AccessTokenModel,
  BaseTokenSchema,
  RefreshTokenModel,
} from 'database/lib/schemata/token';
import connection, { disconnect } from 'database/lib';

export const fetchToken = async (
  token: string
): Promise<Document<BaseTokenSchema>> => {
  try {
    await connection();
    const [accessToken, refreshToken] = await Promise.all([
      AccessTokenModel.findById(token),
      RefreshTokenModel.findById(token),
    ]);

    let tokenDoc = (accessToken ||
      refreshToken) as unknown as Document<BaseTokenSchema>;

    if (tokenDoc) {
      tokenDoc = await tokenDoc
        .populate({
          path: 'authorization',
          populate: { path: 'client_id user', select: '-password' },
        })
        .execPopulate();
    }

    return tokenDoc;
  } finally {
    await disconnect();
  }
};
