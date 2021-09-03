<div align="center">
  <h1>OpenID Connect Provider</h1>
  <strong>A bare-bones <a href="https://openid.net/connect/" rel="noopener noreferrer">OpenID Connect</a> framework. 🔐</strong>
  <br />
  <br />
  <br />
</div>

## About

This is a monorepo containing the bare-minimal functionality to start building an OpenID Connect RP from scratch. It is divided into several packages:

- **[`@saschazar/oidc-provider-config`](https://github.com/saschazar21/now-oidc-provider/tree/master/packages/config)** - sources for providing the global configuration of the provider.
- **[`@saschazar/oidc-provider-database`](https://github.com/saschazar21/now-oidc-provider/tree/master/packages/database)** - [MongoDB](https://mongodb.com/) database client and models.
- **[`@saschazar/oidc-provider-jwt`](https://github.com/saschazar21/now-oidc-provider/tree/master/packages/jwt)** - helper functions for signing/verifying, as well as encrypting/decrypting JWTs.
- **[`@saschazar/oidc-provider-lambda`](https://github.com/saschazar21/now-oidc-provider/tree/master/packages/lambda)** - adapter for [AWS Lambda](https://aws.amazon.com/lambda/) functions. This package wraps functions exported from [`middleware/endpoints`](https://github.com/saschazar21/now-oidc-provider/tree/main/packages/middleware/endpoints).
- **[`@saschazar/oidc-provider-middleware`](https://github.com/saschazar21/now-oidc-provider/tree/master/packages/middleware)** - contains the main logic of the provider:
  - **[`endpoints`](https://github.com/saschazar21/now-oidc-provider/tree/main/packages/middleware/endpoints)** - the raw request handlers, each exports a function that takes an `IncomingMessage` and `ServerResponse` as parameters and returns a `Promise`. (see [Endpoints](#endpoints) below)
  - **[`lib`](https://github.com/saschazar21/now-oidc-provider/tree/main/packages/middleware/lib)** - contains the actual endpoint logic.
  - **[`strategies`](https://github.com/saschazar21/now-oidc-provider/tree/main/packages/middleware/strategies)** - defines the contents of the `/api/authorization` endpoints, based on the `response_type` parameter of the initial request.
- **[`@saschazar/oidc-provider-types`](https://github.com/saschazar21/now-oidc-provider/tree/master/packages/types)** - contains various type definitions across OpenID Connect and OAuth 2.0.
- **[`@saschazar/oidc-provider-utils`](https://github.com/saschazar21/now-oidc-provider/tree/master/packages/utils)** - shared utility functionality.

### Prerequisites

- [Node.js](https://nodejs.org) - the chosen runtime for this project,
- [MongoDB](https://mongodb.com) - the database engine used for storing session data, tokens, etc.

Other than the above, no other dependencies are required by this project. However, this is not a standalone project, but rather a starting point for building an OpenID Connect provider.

### Included

Although specified as a bare-bones framework, it includes a complete set of necessary features to comply with the OpenID Connect standard.

#### Endpoints

The following endpoints are included by default and each consists of a single entrypoint in the form of `(req, res) => Promise<void>`:

- `/.well-known/openid-configuration`: OpenID Connect discovery endpoint.
- `/api/jwks`: JWKS endpoint for returning the public key for verifying the signature of the ID token.
- `/api/authorization`: Authorization endpoint for creating a new session and returning an authorization code to the client.
- `/api/token`: Token endpoint for exchanging an authorization code for an access token.
- `/api/token/introspect`: Token introspection endpoint for checking the validity of an access token.
- `/api/token/revoke`: Token revocation endpoint for revoking a refresh token.
- `/api/userinfo`: Userinfo endpoint for returning the user's profile information based on the requested scopes.
- `/api/login`: Login endpoint for authenticating the user.
- `/api/consent`: Consent endpoint for requesting consent from the user.

#### Database Models

The following [MongoDB](https://mongodb.com/) database models are used by the provider, and should be used when extending the functionality (e.g. user management):

- [`AuthorizationModel`](https://github.com/saschazar21/now-oidc-provider/blob/master/packages/database/lib/schemata/authorization.ts) - creates and handles authorization sessions.
- [`ClientModel`](https://github.com/saschazar21/now-oidc-provider/blob/master/packages/database/lib/schemata/client.ts) - used to register and retrieve client applications.
- [`AuthorizationCodeModel`, `AccessTokenModel` & `RefreshTokenModel`](https://github.com/saschazar21/now-oidc-provider/blob/master/packages/database/lib/schemata/token.ts) - creates authorization code, access- and refresh tokens, each linked to their respective authorization session.
- [`UserModel`](https://github.com/saschazar21/now-oidc-provider/blob/master/packages/database/lib/schemata/user.ts) - used to register and retrieve users.

### Not included

- user- & client registration logic
- deployment logic
- any kind of frontend routes, views, or logic - the endpoints listed above are expecting the following frontend routes:
  - `/login`: login page, containing an HTML form which submits login data to `/api/login`.
  - `/consent`: consent page, containing an HTML form which submits consent data to `/api/consent`.

## Documentation

... is currently work in progress.

## License

Licensed under the MIT license.

Copyright ©️ 2021 [Sascha Zarhuber](https://sascha.work)
