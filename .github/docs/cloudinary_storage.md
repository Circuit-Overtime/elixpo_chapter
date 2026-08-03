# Creator-owned Cloudinary storage

LixBlogs keeps its platform Cloudinary environment as the default. A creator can
optionally connect a Cloudinary product environment from **Settings → Integrations**
and choose it for future blog covers and editor images.

## Deployment setup

1. Generate an independent encryption key:

   ```bash
   openssl rand -base64 32
   ```

2. Store it as the Cloudflare Pages secret
   `CLOUDINARY_CONNECTION_ENCRYPTION_KEY`. Do not reuse `SESSION_SECRET` or commit
   the plaintext value. Keep this key stable: rotating it without first
   re-encrypting stored connections makes those connections unreadable.
3. Apply D1 migration `0041_cloudinary_connections.sql` before deploying code that
   uses the new columns:

   ```bash
   npm run db:migrate
   ```

The connection screen accepts the API environment URL shown under Cloudinary
Console → API Keys:

```text
cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

The API validates the credentials against Cloudinary before encrypting the API
secret with AES-GCM. Responses expose only the cloud name and tracked usage.

## Storage behavior

- Existing media remains in its original Cloudinary environment.
- Changing the preference affects only future blog media.
- Profile and organization identity artwork remains in the LixBlogs-managed
  environment so canonical avatar and banner URLs stay stable.
- Platform quota accounting includes only `platform_cloudinary` media.
- The Media tab labels every asset with its owning storage space.
- A personal connection cannot be removed while tracked media still depends on
  it. Creators can switch future uploads back to LixBlogs without removing it.
- Deletes and account purges use the provider recorded on each media row.

## Future OAuth upgrade

The data model deliberately separates the connection from individual media rows,
so API-key authentication can later be replaced with Cloudinary OAuth without
moving existing assets. Cloudinary self-service OAuth applications are currently
documented as beta; an OAuth rollout should request Upload, Asset Management, and
Offline Access scopes and rotate single-use refresh tokens atomically.
