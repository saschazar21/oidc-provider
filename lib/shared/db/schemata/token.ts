import mongoose, { Schema } from 'mongoose';

import { ALPHABET_LENGTH } from '~/lib/shared/config/id';
import { LIFETIME } from '~/lib/shared/types/lifetime';
import id from '~/lib/shared/util/id';

const generateId = id(ALPHABET_LENGTH.LONG);

const discriminatorOptions = {
  discriminatorKey: 'type',
};

const accessTokenSchema = new Schema(
  {
    _id: {
      required: true,
      trim: true,
      type: String,
    },
    createdAt: {
      default: Date.now,
      index: {
        expires: LIFETIME.ACCESS_TOKEN,
        unique: true,
      },
      type: Date,
    },
    updatedAt: Date,
    active: {
      default: true,
      type: Boolean,
    },
    authorization: {
      ref: 'Authorization',
      required: true,
      type: String,
    },
  },
  discriminatorOptions
);

const refreshTokenSchema = new Schema(
  {
    createdAt: {
      default: Date.now,
      index: {
        expires: LIFETIME.REFRESH_TOKEN,
        unique: true,
      },
      type: Date,
    },
  },
  discriminatorOptions
);

accessTokenSchema.pre('validate', async function () {
  if (this.get('_id')) {
    throw new Error('ERROR: Custom ID is not allowed!');
  }
  this.set({ _id: await generateId() });
});

export const AccessTokenModel = mongoose.model(
  'AccessToken',
  accessTokenSchema
);

export const RefreshTokenModel = AccessTokenModel.discriminator(
  'RefreshToken',
  refreshTokenSchema
);
