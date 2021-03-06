const mongoose = require('../setup');

module.exports = {
  accountId: {
    required: true,
    type: String,
    ref: 'User',
  },
  acr: String,
  amr: [String],
  azp: String,
  aud: {
    default: [this.clientId],
    type: [String],
  },
  auth_time: Date,
  claims: mongoose.SchemaTypes.Mixed,
  clientId: {
    required: true,
    type: String,
    ref: 'Client',
  },
  exp: {
    required: true,
    type: Number,
  },
  grantId: {
    required: true,
    type: String,
  },
  iat: {
    required: true,
    type: Number,
  },
  iss: {
    required: true,
    type: String,
  },
  jti: {
    required: true,
    type: String,
  },
  kind: String,
  nonce: String,
  redirectUri: String,
  scope: {
    required: true,
    type: String,
  },
  sub: {
    default: this.accountId,
    type: String,
  },
};
