# LixBlogs API v1 contract

The CLI is a public OAuth client. Accounts issues credentials; LixBlogs is the
resource server. The CLI must never connect to D1 or carry a client secret.

## Origins and discovery

- OAuth issuer: `https://accounts.elixpo.com`
- Token audience: `blogs.elixpo.com`
- Resource root: `https://blogs.elixpo.com/api/v1`
- Contract metadata: `GET /api/v1`

Production bearer tokens are EdDSA access tokens issued to an allowlisted CLI
client. LixBlogs verifies their signature, expiry, audience, client, scopes,
and local account before querying creator data. Tokens are never persisted or
logged by the resource API.

## Initial resources

| Method | Path | Scope | Behavior |
| --- | --- | --- | --- |
| `GET` | `/api/v1` | public | API and compatibility metadata |
| `GET` | `/api/v1/me` | `lixblogs:profile:read` | Current LixBlogs identity |
| `GET` | `/api/v1/blogs` | `lixblogs:blog:read` | Accessible blog metadata |
| `GET` | `/api/v1/blogs/{id}` | `lixblogs:blog:read` | One accessible blog and its content |
| `POST` | `/api/v1/blogs` | `lixblogs:blog:write` | Create a draft |
| `PATCH` | `/api/v1/blogs/{id}` | `lixblogs:blog:write` | Edit a draft or post |
| `POST` | `/api/v1/blogs/{id}/publish` | `lixblogs:blog:publish` | Publish a post |
| `POST` | `/api/v1/blogs/{id}/unpublish` | `lixblogs:blog:publish` | Return a post to draft |
| `DELETE` | `/api/v1/blogs/{id}` | `lixblogs:blog:delete` | Move a post to trash |
| `POST` | `/api/v1/blogs/{id}/restore` | `lixblogs:blog:delete` | Restore a trashed post |
| `GET` | `/api/v1/orgs` | `lixblogs:org:read` | Organizations the caller belongs to |
| `GET` | `/api/v1/orgs/{id}` | `lixblogs:org:read` | One caller-visible organization and role |
| `GET` | `/api/v1/orgs/{id}/collections` | `lixblogs:org:read` | Collections within a caller membership |
| `GET` | `/api/v1/orgs/{id}/members` | `lixblogs:org:read` | Members and roles within a caller membership |
| `GET` | `/api/v1/blogs/{id}/collaborators` | `lixblogs:collab:read` | Editorial team and effective role |
| `POST` | `/api/v1/blogs/{id}/collaborators` | `lixblogs:collab:write` | Invite or reassign a collaborator |
| `PATCH` | `/api/v1/blogs/{id}/collaborators` | `lixblogs:collab:write` | Change a collaborator role |
| `DELETE` | `/api/v1/blogs/{id}/collaborators` | `lixblogs:collab:write` | Remove a collaborator or leave a team |
| `GET` | `/api/v1/collaboration/invitations` | `lixblogs:collab:read` | Current identity's invitations |
| `POST` | `/api/v1/collaboration/invitations` | `lixblogs:collab:write` | Accept or decline an invitation |

`GET /api/v1/blogs` accepts `status=all|draft|published`, `limit=1..100`, and
an opaque `cursor`. Results include authored blogs, accepted collaborations,
and blogs belonging to organizations of which the caller is a member. Access
misses return `404` so resource existence is not disclosed.

Permanent deletion uses `DELETE /api/v1/blogs/{id}?permanent=true`. It requires
the additional `lixblogs:blog:delete:permanent` scope and an
`X-Confirm-Permanent-Delete` header equal to the blog ID.

## Response shape

Successful responses use:

```json
{ "data": {}, "meta": {} }
```

Errors use a stable machine-readable envelope:

```json
{
  "error": {
    "code": "invalid_token",
    "message": "The access token is malformed.",
    "requestId": "..."
  }
}
```

Every response carries `X-LixBlogs-API-Version` and `X-Request-ID`. Authenticated
responses also expose bounded per-minute `X-RateLimit-*` values. Clients should
use error codes rather than matching human-readable messages.

## Concurrency and retries

Single-blog reads include a strong `ETag`. Future write endpoints require
`If-Match` so a stale CLI cannot silently overwrite a newer browser edit.

Mutation requests use an `Idempotency-Key` containing 8–128 URL-safe
characters. Reservations live for 24 hours:

- same key and same request: replay the retained response;
- same key while running: `idempotency_in_progress`;
- same key with different input: `idempotency_key_reused`.

Operational rows are pruned in bounded batches. Audit events record the caller,
client, action, resource, outcome, and request ID, never bearer material.

## Compatibility policy

The `/api/v1` URL and envelope are stable for the v1 lifetime. Fields may be
added without a major version change; existing fields and error codes are not
removed or redefined. A breaking change requires `/api/v2`. The metadata
endpoint advertises `minCliVersion`; clients below it must stop before making
authenticated requests and present an upgrade instruction.
