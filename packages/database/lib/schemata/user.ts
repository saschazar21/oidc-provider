import mongoose, { Document, Schema, UpdateQuery } from 'mongoose';

import { ACR_VALUES } from 'utils/lib/types/acr';
import { ALPHABET_LENGTH } from 'utils/lib/config/id';
import { EMAIL_REGEX } from 'utils/lib/types/email';
import { URL_REGEX } from 'utils/lib/types/url';
import id, { id as idSync } from 'utils/lib/util/id';
import hashPassword, { comparePassword } from 'utils/lib/util/password';

export type AddressSchema = {
  _id?: string;
  formatted?: string;
  street_address?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

export type UserSchema = {
  _id?: string;
  active?: boolean;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: Date;
  zoneinfo?: string;
  locale?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: AddressSchema;
  acr?: string;
  consents?: string[];
};

const generateId = id(ALPHABET_LENGTH.SHORT);

const rightPad = (val: string): string => (val ? `${val} ` : '');

const addressSchema = new Schema<Document<AddressSchema>>({
  _id: {
    default: idSync(),
    type: String,
  },
  street_address: {
    trim: true,
    type: String,
  },
  locality: {
    trim: true,
    type: String,
  },
  region: {
    trim: true,
    type: String,
  },
  postal_code: {
    trim: true,
    type: String,
  },
  country: {
    trim: true,
    type: String,
  },
});

addressSchema.virtual('formatted').get(function () {
  return `${this.street_address}
${rightPad(this.postal_code)}${rightPad(this.locality)}${this.region}
${this.country}`;
});

const userSchema = new Schema<Document<UserSchema>>({
  _id: {
    alias: 'sub',
    required: true,
    trim: true,
    type: String,
  },
  active: {
    default: true,
    type: Boolean,
  },
  password: {
    required: true,
    trim: true,
    type: String,
  },
  createdAt: {
    default: Date.now,
    type: Date,
  },
  updatedAt: {
    alias: 'updated_at',
    type: Date,
  },
  given_name: {
    trim: true,
    type: String,
  },
  family_name: {
    trim: true,
    type: String,
  },
  middle_name: {
    trim: true,
    type: String,
  },
  nickname: {
    trim: true,
    type: String,
  },
  preferred_username: {
    trim: true,
    type: String,
  },
  profile: {
    lowercase: true,
    validate: {
      validator: (value: string): boolean => URL_REGEX.test(value),
      message: ({ value }): string =>
        `ERROR: ${value} is an invalid URL! Only 'http(s)://'-prefixes are allowed!`,
    },
    trim: true,
    type: String,
  },
  picture: {
    lowercase: true,
    validate: {
      validator: (value: string): boolean => URL_REGEX.test(value),
      message: ({ value }): string =>
        `ERROR: ${value} is an invalid URL! Only 'http(s)://'-prefixes are allowed!`,
    },
    trim: true,
    type: String,
  },
  website: {
    lowercase: true,
    validate: {
      validator: (value: string): boolean => URL_REGEX.test(value),
      message: ({ value }): string =>
        `ERROR: ${value} is an invalid URL! Only 'http(s)://'-prefixes are allowed!`,
    },
    trim: true,
    type: String,
  },
  email: {
    lowercase: true,
    required: true,
    unique: true,
    validate: {
      validator: (value: string): boolean => EMAIL_REGEX.test(value),
      message: ({ value }): string =>
        `ERROR: ${value} is an invalid E-Mail Address!`,
    },
    trim: true,
    type: String,
  },
  email_verified: {
    default: false,
    type: Boolean,
  },
  gender: {
    enum: ['female', 'male', 'other', 'none'],
    type: String,
  },
  birthdate: Date,
  zoneinfo: String,
  locale: String,
  phone_number: String,
  phone_number_verified: {
    default: false,
    type: Boolean,
  },
  address: addressSchema,
  acr: {
    default: (): string => ACR_VALUES.BASIC,
    enum: Object.values(ACR_VALUES),
    type: String,
  },
  consents: [
    {
      ref: 'Client',
      type: String,
    },
  ],
});

userSchema
  .virtual('name')
  .get(function () {
    return `${rightPad(this.given_name)}${this.family_name}`;
  })
  .set(function (name: string): void {
    const [given_name, family_name] = name.split(/\s+/);
    this.set({ given_name, family_name });
  });

userSchema.method('comparePassword', async function (plain: string) {
  return comparePassword(plain, this.get('password'));
});

userSchema.pre('validate', async function () {
  if (this.get('_id')) {
    throw new Error('ERROR: Custom ID is forbidden!');
  }
  this.set({ _id: await generateId() });
});

userSchema.pre('save', async function () {
  this.set({
    password: await hashPassword(this.get('password')),
  });
});

userSchema.pre('findOneAndUpdate', async function () {
  const {
    _id = '',
    password = '',
    $set: { _id: nestedId = '', password: nestedPassword = '' } = {},
  } = this.getUpdate() as UpdateQuery<UserSchema>;

  if (_id.length || nestedId.length) {
    throw new Error('ERROR: Custom ID is forbidden!');
  }

  if (password.length) {
    this.update({}, { password: await hashPassword(password) });
  }

  if (nestedPassword.length) {
    this.update(
      {},
      {
        $set: {
          password: await hashPassword(nestedPassword),
        },
      }
    );
  }

  await this.update({}, { $set: { updatedAt: new Date() }, $inc: { __v: 1 } });
});

export const UserModel = mongoose.model<UserSchema>('User', userSchema);

export default UserModel;
