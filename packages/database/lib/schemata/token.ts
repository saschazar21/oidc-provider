import mongoose, { Document, Schema } from 'mongoose';

import { ALPHABET_LENGTH } from 'config/lib/id';
import { LIFETIME } from 'utils/lib/types/lifetime';
import { TOKEN_TYPE } from 'utils/lib/types/token_type';
import id from 'utils/lib/util/id';

export type BaseTokenSchema = {
  _id?: string;
  created_at?: Date;
  updated_at?: Date;
  active?: boolean;
  authorization: string;
};

export type AccessTokenSchema = BaseTokenSchema & {
  type: TOKEN_TYPE.ACCESS_TOKEN;
  expires_at?: Date;
};

export type RefreshTokenSchema = BaseTokenSchema & {
  type: TOKEN_TYPE.REFRESH_TOKEN;
  expires_at?: Date;
};

const generateId = id(ALPHABET_LENGTH.LONG);

const discriminatorOptions = {
  discriminatorKey: 'type',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
};

const baseTokenSchema = new Schema<Document<BaseTokenSchema>>(
  {
    _id: {
      required: true,
      trim: true,
      type: String,
    },
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

const accessTokenSchema = new Schema<Document<AccessTokenSchema>>(
  {
    expires_at: {
      default: (): Date => new Date(Date.now() + LIFETIME.ACCESS_TOKEN * 1000),
      type: Date,
    },
  },
  discriminatorOptions
);
accessTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const refreshTokenSchema = new Schema<Document<RefreshTokenSchema>>(
  {
    expires_at: {
      default: (): Date => new Date(Date.now() + LIFETIME.REFRESH_TOKEN * 1000),
      type: Date,
    },
  },
  discriminatorOptions
);
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

baseTokenSchema.pre('validate', async function () {
  if (this.get('_id')) {
    throw new Error('ERROR: Custom ID is not allowed!');
  }
  this.set({ _id: await generateId() });
});

const BaseTokenModel = mongoose.model<BaseTokenSchema>(
  TOKEN_TYPE.BASE_TOKEN,
  baseTokenSchema
);

export const AccessTokenModel = BaseTokenModel.discriminator(
  TOKEN_TYPE.ACCESS_TOKEN,
  accessTokenSchema
);

export const RefreshTokenModel = BaseTokenModel.discriminator(
  TOKEN_TYPE.REFRESH_TOKEN,
  refreshTokenSchema
);
