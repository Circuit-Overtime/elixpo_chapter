# PR #81 Security & Implementation Notes

## 1. Addressed Vulnerabilities (Fixed in this PR)

*   **Refresh Token Replay (Web & CLI):** Implemented refresh token families with strict parent/child linkage. Rotated tokens are preserved with `revoked_reason='rotated'`. Replaying a rotated token now reliably triggers family-wide revocation and a `refresh_token_reuse_detected` audit event. **Note:** Centralizing this logic caught and fixed a bug where standard logouts/account-revocations were being falsely flagged as reuse. The shared `rotateRefreshToken` wrapper now protects both OAuth clients and first-party web sessions.
*   **Confused-Deputy Audience Verification:** Discovered and fixed a gap where `createDeviceAuthorization` accepted caller-supplied `audience` parameters without validating them against the OAuth client's registered/approved audiences. Added `isRequestedAudienceAllowed` (with unit tests) to enforce strict matching.

## 2. Flagged Security Gaps (Needs Follow-Up)

*   **Missing PKCE on Authorization Code Flow:** The `authorization_code` grant currently lacks Proof Key for Code Exchange (PKCE) support (RFC 7636). The initial discovery document erroneously claimed `S256` support, which was removed in this PR so the authorization server does not lie to clients. This poses a code interception risk for public clients and should be tracked in a dedicated follow-up issue.
*   **Database Migration State:** The `is_admin` and `role` columns on the `users` table were added to the real D1 database manually, outside the official migration files (see `0002_add_col_privilage.sql`). Replaying migrations from scratch locally fails without manual shimming. This is a pre-existing issue but requires attention from the DB owners.

## 3. Threat Model Review (Acceptance Criteria)

*   **Phishing:** The implementation leverages standard device flow (RFC 8628), keeping users on trusted devices for authorization to mitigate traditional phishing vectors.
*   **Code-Guessing:** Enforced via RFC 8628 §3.5 pacing. `interval_seconds` and `poll_count` track polling frequency. Abuse now triggers a `device.poll_abuse` audit event and enforces the `slow_down` penalty.
*   **Replay Attacks:** Addressed via the token family rotation described in Section 1.

## 4. E2E Testing Note

*   The route/logic layers have full Vitest coverage for rotation, reuse, revocation, and scope validation.
*   **Limitation:** The cross-repository E2E requirement (running the real LixBlogs CLI against the browser approval flow) cannot be fully executed in this isolated environment. This must be verified manually or via a CI job against a staging deployment once this PR and the LixBlogs CLI components are merged.
