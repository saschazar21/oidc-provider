import mongoose, { Schema } from 'mongoose';

import { ALPHABET_LENGTH } from '~/lib/shared/config/id';
import { URL_REGEX } from '~/lib/shared/types/url';
import generateId from '~/lib/shared/util/id';

const generateClientId = generateId();
const generateClientSecret = generateId(ALPHABET_LENGTH.LONG);

export const clientSchema = new Schema({
  _id: {
    alias: 'client_id',
    required: true,
    trim: true,
    type: String,
  },
  active: {
    type: Boolean,
    default: () => true,
  },
  client_secret: {
    required: true,
    trim: true,
    type: String,
  },
  createdAt: Date,
  logo: {
    type: String,
    validate: {
      validator: uri => URL_REGEX.test(uri),
      message: ({ value }) =>
        `ERROR: ${value} is an invalid URL! Only 'https://'-prefixes are allowed!`,
    },
  },
  name: {
    required: [true, 'Client name is mandatory!'],
    trim: true,
    type: String,
    unique: true,
  },
  owner: {
    ref: 'Identity',
    // required: true,  // TODO: remove when Idendity is created
    trim: true,
    type: String,
  },
  redirect_uris: {
    type: [String],
    validate: {
      validator: uris =>
        uris.length > 0 &&
        uris.filter(uri => URL_REGEX.test(uri)).length === uris.length,
      message: ({ value }) =>
        `ERROR: One of [${value.join(
          ', '
        )}] is an invalid URL! Only 'https://'-prefixes are allowed!`,
    },
  },
  updatedAt: Date,
});

clientSchema.method('resetSecret', async function resetSecret(): Promise<
  string
> {
  const client_secret = await generateClientSecret();
  this.set({ client_secret, updatedAt: new Date(), __v: this.get('__v') + 1 });
  return client_secret;
});

clientSchema.pre('validate', async function () {
  const self = this as any;
  const [_id, client_secret] = ['_id', 'client_secret'].map(key =>
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

clientSchema.pre('save', function () {
  this.set({ createdAt: new Date() });
});

clientSchema.post('findOneAndUpdate', async function () {
  const model = await this.model.findOne(this.getQuery());
  return model.update({ $set: { updatedAt: new Date() }, $inc: { __v: 1 } });
});

const clientModel = mongoose.model('Client', clientSchema);

export default clientModel;
