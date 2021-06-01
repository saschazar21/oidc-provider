import mongoose, { Document, Schema, UpdateQuery } from 'mongoose';

import { ClientModel } from 'database/lib';
import { ALPHABET_LENGTH } from 'config/lib/id';
import { ACR_VALUES } from 'utils/lib/types/acr';
import { DISPLAY } from 'utils/lib/types/display';
import { LIFETIME } from 'utils/lib/types/lifetime';
import { PKCE } from 'utils/lib/types/pkce';
import { PROMPT } from 'utils/lib/types/prompt';
import { RESPONSE_MODE } from 'utils/lib/types/response_mode';
import { RESPONSE_TYPE } from 'utils/lib/types/response_type';
import { SCOPE } from 'utils/lib/types/scope';
import id from 'utils/lib/util/id';

export type AuthorizationSchema = {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  active?: boolean;
  consent?: boolean;
  user?: string;
  scope: SCOPE[];
  response_type: RESPONSE_TYPE[];
  client_id: string;
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
};

const generateId = id(ALPHABET_LENGTH.LONG);

const authSchema = new Schema<Document<AuthorizationSchema>>({
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
  active: {
    default: false,
    type: Boolean,
  },
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
  client_id: {
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
        const client = await ClientModel.findById(this.get('client_id'));
        const redirect_uris: string[] = client
          ? client.get('redirect_uris')
          : [];
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
  if (this.get('consent')) {
    throw new Error('ERROR: Custom consent is not allowed!');
  }
  if (this.get('active')) {
    throw new Error('ERROR: Custom active state is not allowed!');
  }
  this.set({ _id: await generateId() });
});

authSchema.pre('findOneAndUpdate', async function () {
  const { _id, $set: { _id: nestedId } = {} } =
    this.getUpdate() as UpdateQuery<AuthorizationSchema>;

  if (_id || nestedId) {
    throw new Error('ERROR: Custom ID is not allowed!');
  }

  await this.update({}, { $set: { updatedAt: new Date() }, $inc: { __v: 1 } });
});

export const AuthorizationModel = mongoose.model<AuthorizationSchema>(
  'Authorization',
  authSchema
);

export default AuthorizationModel;
