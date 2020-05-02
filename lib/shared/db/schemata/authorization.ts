import mongoose, { Schema } from 'mongoose';

import { ALPHABET_LENGTH } from '~/lib/shared/config/id';
import { ClientModel } from '~/lib/shared/db';
import { ACR_VALUES } from '~/lib/shared/types/acr';
import { DISPLAY } from '~/lib/shared/types/display';
import { LIFETIME } from '~/lib/shared/types/lifetime';
import { PKCE } from '~/lib/shared/types/pkce';
import { PROMPT } from '~/lib/shared/types/prompt';
import { RESPONSE_MODE } from '~/lib/shared/types/response_mode';
import { RESPONSE_TYPE } from '~/lib/shared/types/response_type';
import { SCOPE } from '~/lib/shared/types/scope';
import id from '~/lib/shared/util/id';

export interface AuthorizationSchema {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  consent?: boolean;
  user?: string;
  scope: SCOPE[];
  response_type: RESPONSE_TYPE[];
  client: string;
  redirect_uri: string;
  state?: string;
  response_mode?: RESPONSE_MODE;
  nonce?: string;
  display?: DISPLAY[];
  prompt?: PROMPT[];
  max_age?: number;
  ui_locales?: string[];
  login_hint?: string;
  acr_values?: ACR_VALUES[];
  code_challenge?: string;
  code_challenge_method?: string;
}

const generateId = id(ALPHABET_LENGTH.LONG);

const authSchema = new Schema({
  _id: {
    required: true,
    trim: true,
    type: String,
  },
  createdAt: {
    default: Date.now,
    index: {
      expires: LIFETIME.REFRESH_TOKEN,
      unique: true,
    },
    type: Date,
  },
  updatedAt: Date,
  consent: {
    default: false,
    type: Boolean,
  },
  user: {
    ref: 'User',
    required: [
      function (): boolean {
        return this.consent;
      },
      'ERROR! User is required, if consent is given!',
    ],
    trim: true,
    type: String,
  },
  scope: {
    enum: Object.values(SCOPE),
    required: true,
    type: [String],
  },
  response_type: {
    enum: Object.values(RESPONSE_TYPE),
    required: true,
    type: [String],
  },
  client: {
    ref: 'Client',
    required: true,
    trim: true,
    type: String,
  },
  redirect_uri: {
    required: true,
    trim: true,
    type: String,
    validate: {
      validator: async function (value: string): Promise<boolean> {
        const client = await ClientModel.findById(this.get('client'));
        const redirect_uris: string[] = client.get('redirect_uris') || [];
        return redirect_uris.indexOf(value) > -1;
      },
      message: ({ value }): string =>
        `ERROR: ${value} not a redirect URL of client!`,
    },
  },
  state: String,
  response_mode: {
    enum: Object.values(RESPONSE_MODE),
    type: String,
  },
  nonce: String,
  display: {
    enum: Object.values(DISPLAY),
    type: [String],
  },
  prompt: {
    enum: Object.values(PROMPT),
    type: [String],
  },
  max_age: Number,
  ui_locales: [String],
  login_hint: String,
  acr_values: {
    enum: Object.values(ACR_VALUES),
    type: [String],
  },
  code_challenge: String,
  code_challenge_method: {
    enum: Object.values(PKCE),
    type: String,
  },
});

authSchema.pre('validate', async function () {
  if (this.get('_id')) {
    throw new Error('ERROR: Custom ID is not allowed!');
  }
  this.set({ _id: await generateId() });
});

authSchema.pre('findOneAndUpdate', async function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const self = this as any;
  const { _id = '', $set: { _id: nestedId = '' } = {} } = this.getUpdate();

  if (_id.length || nestedId.length) {
    throw new Error('ERROR: Custom ID is not allowed!');
  }

  self.update({}, { $set: { updatedAt: new Date() }, $inc: { __v: 1 } });
});

export const AuthorizationModel = mongoose.model('Authorization', authSchema);

export default AuthorizationModel;
