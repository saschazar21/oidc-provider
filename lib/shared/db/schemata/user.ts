import mongoose, { Schema } from 'mongoose';

import { EMAIL_REGEX } from '~/lib/shared/types/email';
import { URL_REGEX } from '~/lib/shared/types/url';
import id, { id as idSync } from '~/lib/shared/util/id';
import hashPassword, { comparePassword } from '~/lib/shared/util/password';

const generateId = id();

const rightPad = (val: string): string => (val ? `${val} ` : '');

const addressSchema = new Schema({
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

addressSchema.virtual('formatted').get(function() {
  return `${this.street_address}
${rightPad(this.postal_code)}${rightPad(this.locality)}${this.region}
${this.country}`;
});

const userSchema = new Schema({
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
      message: ({ value }) =>
        `ERROR: ${value} is an invalid URL! Only 'http(s)://'-prefixes are allowed!`,
    },
    trim: true,
    type: String,
  },
  picture: {
    lowercase: true,
    validate: {
      validator: (value: string): boolean => URL_REGEX.test(value),
      message: ({ value }) =>
        `ERROR: ${value} is an invalid URL! Only 'http(s)://'-prefixes are allowed!`,
    },
    trim: true,
    type: String,
  },
  website: {
    lowercase: true,
    validate: {
      validator: (value: string): boolean => URL_REGEX.test(value),
      message: ({ value }) =>
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
      message: ({ value }) => `ERROR: ${value} is an invalid E-Mail Address!`,
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
});

userSchema
  .virtual('name')
  .get(function() {
    return `${rightPad(this.given_name)}${this.family_name}`;
  })
  .set(function(name: string): void {
    const [given_name, family_name] = name.split(/\s+/);
    this.set({ given_name, family_name });
  });

userSchema.method('comparePassword', async function(plain: string) {
  return comparePassword(plain, this.get('password'));
});

userSchema.pre('validate', async function() {
  if (this.get('_id')) {
    throw new Error('ERROR: Custom ID is forbidden!');
  }
  this.set({ _id: await generateId() });
});

userSchema.pre('save', async function() {
  this.set({
    password: await hashPassword(this.get('password')),
  });
});

userSchema.pre('findOneAndUpdate', async function() {
  const self = this as any;
  const {
    _id = '',
    password = '',
    $set: { _id: nestedId = '', password: nestedPassword = '' } = {},
  } = this.getUpdate();

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
      },
    );
  }

  self.update({}, { $set: { updatedAt: new Date() }, $inc: { __v: 1 } });
});

export const UserModel = mongoose.model('User', userSchema);

export default UserModel;
