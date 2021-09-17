import mongoose, { Schema, UpdateQuery } from 'mongoose';

import { ALPHABET_LENGTH } from '@saschazar/oidc-provider-config/lib/id';
import { HTTPS_REGEX, URL_REGEX } from '@saschazar/oidc-provider-types/lib/url';
import generateId from '@saschazar/oidc-provider-utils/lib/util/id';

import { UserSchema } from './user';

export const NAME = 'Client';

export type ClientSchema = {
  _id?: string;
  active?: boolean;
  client_secret?: string;
  created_at?: Date;
  logo?: string;
  name: string;
  owner: string | UserSchema;
  redirect_uris: string[];
  updated_at?: Date;
};

const generateClientId = generateId();
const generateClientSecret = generateId(ALPHABET_LENGTH.CLIENT_SECRET);

const clientSchema = new Schema<ClientSchema>(
  {
    _id: {
      alias: 'client_id',
      required: true,
      trim: true,
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    client_secret: {
      required: true,
      trim: true,
      type: String,
    },
    logo: {
      lowercase: true,
      type: String,
      validate: {
        validator: (uri: string): boolean => URL_REGEX.test(uri),
        message: ({ value }): string =>
          `ERROR: ${value} is an invalid URL! Only 'http(s)://'-prefixes are allowed!`,
      },
    },
    name: {
      required: [true, 'Client name is mandatory!'],
      trim: true,
      type: String,
      unique: true,
    },
    owner: {
      ref: 'User',
      required: true,
      type: String,
    },
    redirect_uris: {
      lowercase: true,
      type: [String],
      validate: {
        validator: (uris: string[]): boolean =>
          uris.length > 0 &&
          uris.filter((uri) => HTTPS_REGEX.test(uri)).length === uris.length,
        message: ({ value }): string =>
          `ERROR: One of [${value.join(
            ', '
          )}] is an invalid URL! Only 'https://'-prefixes are allowed!`,
      },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

clientSchema.method(
  'resetSecret',
  async function resetSecret(): Promise<string> {
    const client_secret = await generateClientSecret();
    this.set({
      client_secret,
      __v: this.get('__v') + 1,
    });
    return client_secret;
  }
);

clientSchema.pre('validate', async function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const self = this as any;
  const [_id, client_secret] = ['_id', 'client_secret'].map((key) =>
    self.get(key)
  );

  if (_id || client_secret) {
    throw new Error('ERROR: Custom id or client_secret is not allowed!');
  }

  this.set({
    _id: await generateClientId(),
    client_secret: await generateClientSecret(),
  });
});

clientSchema.pre('findOneAndUpdate', async function () {
  const {
    $set: { _id: nestedId, client_secret: nestedClientSecret } = {},
    _id,
    client_secret,
  } = this.getUpdate() as UpdateQuery<ClientSchema>;

  if (_id || client_secret || nestedId || nestedClientSecret) {
    throw new Error('ERROR: Updating client_id or client_secret is forbidden!');
  }

  await this.update({}, { $inc: { __v: 1 } });
});

export const ClientModel =
  mongoose.models[NAME] || mongoose.model<ClientSchema>(NAME, clientSchema);

export default ClientModel;
