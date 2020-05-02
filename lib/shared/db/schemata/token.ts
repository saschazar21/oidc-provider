import mongoose, { Schema } from 'mongoose';

import { ALPHABET_LENGTH } from '~/lib/shared/config/id';
import { LIFETIME } from '~/lib/shared/types/lifetime';
import id from '~/lib/shared/util/id';

export interface BaseTokenSchema {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  active?: boolean;
  authorization: string;
}

export interface AccessTokenSchema extends BaseTokenSchema {
  type: 'AccessToken';
  expires?: Date;
}

export interface RefreshTokenSchema extends BaseTokenSchema {
  type: 'RefreshToken';
  expires?: Date;
}

const generateId = id(ALPHABET_LENGTH.LONG);

const discriminatorOptions = {
  discriminatorKey: 'type',
};

const baseTokenSchema = new Schema(
  {
    _id: {
      required: true,
      trim: true,
      type: String,
    },
    createdAt: {
      default: Date.now,
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
  discriminatorOptions,
);

const accessTokenSchema = new Schema(
  {
    createdAt: {
      default: Date.now,
      index: {
        expires: LIFETIME.ACCESS_TOKEN,
        unique: true,
      },
      type: Date,
    },
    expires: {
      default: (): number => Date.now() + LIFETIME.ACCESS_TOKEN * 1000,
      type: Date,
    },
  },
  discriminatorOptions,
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
    expires: {
      default: (): number => Date.now() + LIFETIME.REFRESH_TOKEN * 1000,
      type: Date,
    },
  },
  discriminatorOptions,
);

baseTokenSchema.pre('validate', async function () {
  if (this.get('_id')) {
    throw new Error('ERROR: Custom ID is not allowed!');
  }
  this.set({ _id: await generateId() });
});

const BaseTokenModel = mongoose.model('BaseToken', baseTokenSchema);

export const AccessTokenModel = BaseTokenModel.discriminator(
  'AccessToken',
  accessTokenSchema,
);

export const RefreshTokenModel = BaseTokenModel.discriminator(
  'RefreshToken',
  refreshTokenSchema,
);
