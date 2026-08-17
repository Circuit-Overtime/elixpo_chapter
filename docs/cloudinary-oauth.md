# Cloudinary OAuth storage

Signed-in users can connect a Cloudinary product environment from the
Integrations section of their profile. When personal storage is enabled, new
canvas and document images are uploaded through the LixSketch server to that
environment and do not consume the platform-managed per-workspace image quota.
The connection form asks for the environment's public cloud name because some
Cloudinary OAuth grants omit it; the callback verifies that the OAuth token can
access the supplied environment before storing the connection.

## OAuth application

Configure the Cloudinary OAuth application with:

- Redirect URI: `http://localhost:3000/api/integrations/cloudinary/callback`
- Post-logout URI: `http://localhost:3000/settings?tab=integrations`
- Scopes: `openid offline_access asset_management upload`

Set these server-side environment variables:

```dotenv
CLOUDINARY_OAUTH_CLIENT_ID=4aad3dcb-f4dc-43ac-a68b-60e70345f606
CLOUDINARY_OAUTH_CLIENT_SECRET=
CLOUDINARY_CONNECTION_ENCRYPTION_KEY=
```

`CLOUDINARY_CONNECTION_ENCRYPTION_KEY` should be a long random secret in
production. For the requested local setup, the implementation falls back to
`CLOUDINARY_OAUTH_CLIENT_ID` when the dedicated encryption key is absent.
OAuth access and refresh tokens are encrypted with AES-GCM and never returned
to browser code.

Apply D1 migrations before testing the connection:

```bash
npm run db:migrate:local
```
