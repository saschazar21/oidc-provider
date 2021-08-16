import mongoose, { Document, Schema, UpdateQuery } from 'mongoose';

import { ACR_VALUES } from 'types/lib/acr';
import { ALPHABET_LENGTH } from 'config/lib/id';
import { EMAIL_REGEX } from 'types/lib/email';
import { URL_REGEX } from 'types/lib/url';
import id from 'utils/lib/util/id';
import hashPassword, { comparePassword } from 'utils/lib/util/password';

export type AddressSchema = {
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
  created_at?: Date;
  updated_at?: Date;
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

type User = Document<UserSchema> &
  UserSchema & {
    comparePassword: (plain: string) => Promise<boolean>;
  };

const generateId = id(ALPHABET_LENGTH.SHORT);

const rightPad = (val: string): string => (val ? `${val} ` : '');

const addressSchema = new Schema<AddressSchema>(
  {
    _id: false,
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
  },
  {
    toJSON: {
      virtuals: true,
    },
  }
);

addressSchema.virtual('formatted').get(function () {
  const formatted = `${this.street_address}
${rightPad(this.postal_code)}${rightPad(this.locality)}${this.region}
${this.country}`;
  return formatted.length ? formatted : undefined;
});

const userSchema = new Schema<User>(
  {
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
      default(): string {
        return this.preferred_username;
      },
      trim: true,
      type: String,
    },
    preferred_username: {
      default(): string {
        return this.nickname;
      },
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
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema
  .virtual('name')
  .get(function () {
    const name = `${rightPad(this.given_name)}${this.family_name}`;
    return name.length ? name : undefined;
  })
  .set(function (name: string): void {
    const [given_name, family_name] = name.split(/\s+/);
    this.set({ given_name, family_name });
  });

userSchema.methods.comparePassword = async function (
  plain: string
): Promise<boolean> {
  return comparePassword(plain, this.get('password'));
};

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

  await this.update({}, { $inc: { __v: 1 } });
});

const User = mongoose.model<User>('User', userSchema);

export default User;
