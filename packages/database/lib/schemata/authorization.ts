import mongoose, { Document, Schema, UpdateQuery } from 'mongoose';

import { ClientModel, UserModel } from '@saschazar/oidc-provider-database/lib';
import { ALPHABET_LENGTH } from 'config/lib/id';
import { ACR_VALUES } from 'types/lib/acr';
import { DISPLAY } from 'types/lib/display';
import { LIFETIME } from 'types/lib/lifetime';
import { PKCE } from 'types/lib/pkce';
import { PROMPT } from 'types/lib/prompt';
import { RESPONSE_MODE } from 'types/lib/response_mode';
import { RESPONSE_TYPE } from 'types/lib/response_type';
import { SCOPE } from 'types/lib/scope';
import id from 'utils/lib/util/id';

export type Authorization = {
  _id?: string;
  created_at?: Date;
  updated_at?: Date;
  expires_at?: Date;
  consent?: boolean;
  user?: string;
  scope: SCOPE[];
  response_type: RESPONSE_TYPE[];
  client_id?: string;
  redirect_uri?: string;
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

export type AuthorizationSchema = Authorization & {
  client_id: string;
  redirect_uri: string;
};

const generateId = id(ALPHABET_LENGTH.LONG);

const authSchema = new Schema<Document<AuthorizationSchema>>(
  {
    _id: {
      required: true,
      trim: true,
      type: String,
    },
    expires_at: {
      default: (): Date => new Date(Date.now() + LIFETIME.REFRESH_TOKEN * 1000),
      type: Date,
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
          return redirect_uris.includes(value);
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
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
authSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

authSchema.pre('validate', async function () {
  if (this.get('_id')) {
    throw new Error('ERROR: Custom ID is not allowed!');
  }
  if (this.get('consent')) {
    const user =
      this.get('user') &&
      (await UserModel.findById(this.get('user'), 'consents'));
    if (
      !user ||
      user.get('consents')?.length < 1 ||
      user.get('consents').indexOf(this.get('client_id')) < 0
    ) {
      throw new Error('ERROR: Custom consent without user is not allowed!');
    }
  }
  this.set({ _id: await generateId() });
});

authSchema.pre('findOneAndUpdate', async function () {
  const { _id, $set: { _id: nestedId } = {} } =
    this.getUpdate() as UpdateQuery<AuthorizationSchema>;

  if (_id || nestedId) {
    throw new Error('ERROR: Custom ID is not allowed!');
  }

  await this.update({}, { $inc: { __v: 1 } });
});

export const AuthorizationModel = mongoose.model<AuthorizationSchema>(
  'Authorization',
  authSchema
);

export default AuthorizationModel;
