# Lixrl Product Audit

**Audit date:** 25 August 2026  
**Original audit revision:** `9a02e83`  
**Implementation revision reviewed:** `859ba19` on `feat/product-audit-remediation`  
**Tracking:** [Issue #22](https://github.com/elixpo/lixrl.com/issues/22) · [Draft PR #23](https://github.com/elixpo/lixrl.com/pull/23)  
**Competitive frame:** Bitly (direct competitor) and Pastebin (adjacent competitor)  
**Scope:** Product positioning, acquisition, landing experience, dashboard, plans, API, documentation, privacy, security, abuse prevention, reliability, and operational readiness.

**Executive assessment**

Lixrl has the foundation of a compelling developer-focused URL shortener: an unusually low-friction guest flow, Cloudflare-native redirects, persistent account links, analytics, QR generation, API access, and an interface that is substantially less crowded than mature competitors. The best strategic opening is not to reproduce every Bitly feature. It is to become the simpler, privacy-conscious, developer-first choice with fast onboarding and honest, understandable limits.

The original revision was best classified as a promising public beta. PR #23
materially changes that assessment: the critical authentication,
authorization, destination-update, and expiry findings are remediated; the
free daily allowance is enforced; and pricing no longer advertises unshipped
domains, seats, or webhooks. Keep the product in public beta until the PR
receives a real Next.js/Cloudflare Pages build, migrations are applied through
the deployment workflow, and the remaining operational controls below are
verified in production.

Bitly is the direct commercial benchmark. It competes with branded domains, UTM campaigns, redirects, integrations, dynamic QR codes, routing, and detailed analytics. Pastebin is not a direct URL-shortening competitor; it competes for the same desire to share something instantly without setup. Its relevant lessons are explicit expiry, clear visibility controls, anonymous creation, and mature abuse handling. Lixrl should learn from that workflow without adding paste hosting and its much larger moderation burden.

**Remediation status after PR #23**

| Audit area | Status | What remains |
|---|---|---|
| 2.1 Authentication and authorization | Remediated | Rotate the production OAuth client secret and verify log removal |
| 2.2 Redirect expiry | Remediated | Production cache/expiry integration test |
| 2.3 Paid-plan truthfulness | Remediated | Do not restore domains, seats, webhooks, or rate claims before enforcement |
| 2.4 Free daily allowance | Remediated | Observe false positives and quota conversion after launch |
| 2.5 Documentation contracts | Mostly remediated | OpenAPI source of truth and contract tests |
| 2.6 Privacy and lifecycle | Partially remediated | Scheduled cleanup independent of dashboard activity |
| 2.7 Abuse operations | Foundation shipped | Notifications, review SLA, appeals, and reputation signals |
| 2.8 Guest failure handling | Remediated | Monitor cleanup cost and failed-claim recovery |
| 2.9 Onboarding | Partially remediated | Claim a guest link into the newly created account |
| 2.10 Analytics quality | Partially remediated | Validate bot accuracy and expose definitions in the dashboard |
| 2.11 Reliability evidence | Partially remediated | Repair CI, run Pages build, add integration tests, publish SLOs |
| 2.12 Competitive workflows | Partially remediated | Custom domains are the next major paid capability |

---

## 1. Pros and defensible advantages

### 1.1 Excellent first-use loop

The landing page lets a visitor paste a destination and shorten it immediately. The primary action, “Shorten Your URL in 1 Click,” describes the result rather than forcing the visitor to understand the product first. A guest receives one short link with a 24-hour lifetime and sees the persistence trade-off near the input.

This is a stronger acquisition mechanic than an account wall because it demonstrates value before requesting registration. Bitly also supports guest shortening from its homepage, validating this general pattern, while Lixrl can make the expiry and account upgrade much clearer and more deliberate.

**Why it matters:**

- Visitors experience the redirect before being asked to trust the account system.
- A 24-hour guest lifetime controls database growth and creates a natural registration prompt.
- The shortener itself is the landing-page demonstration; no separate interactive demo is required.
- The full-width input on large screens gives the primary task appropriate visual priority.

### 1.2 Good architectural fit for the product

Cloudflare Pages, D1, and KV are appropriate primitives for a global shortener. D1 is authoritative for links, while KV accelerates redirect lookup. Redirect tracking is scheduled outside the immediate response path, reducing the amount of analytics work a visitor waits for.

The architecture also keeps the runtime small: Next.js edge routes, Web APIs, Tailwind, and no large component framework. That creates the potential for a genuinely fast product with a modest operating footprint.

**Existing technical strengths:**

- Edge runtime is declared throughout the API surface.
- D1 remains the record of truth rather than KV.
- Negative caching protects D1 from repeated scans for nonexistent slugs.
- Guest quotas are claimed in D1 rather than relying only on eventually consistent KV.
- The link model already supports activation, expiry, titles, custom codes, and click totals.
- API keys are stored as hashes rather than retaining the original credential.
- Same-origin protection is applied to cookie-authenticated mutation requests.

### 1.3 A useful product foundation already exists

Lixrl is more than a redirect endpoint. The repository contains account links, searchable URL management, per-link analytics, CSV export, QR customization, API keys, subscriptions, documentation, and billing-webhook support. These features form a coherent base for a lightweight link-management product.

The dashboard also exposes a three-day analytics preview to free users. This is a good upgrade pattern: users can understand the value of analytics before paying, rather than seeing only a locked screen.

### 1.4 Clear developer-oriented potential

The REST API, API-key management, cURL examples, copy-for-LLM documentation, predictable route structure, and Elixpo Blogs integration create a credible developer-first direction. Bitly supports many integrations, but its breadth also creates complexity. Lixrl can win a smaller segment through concise documentation, stable contracts, fast key creation, and a focused API.

The strongest potential promise is: **create a durable short link from an application in minutes, without navigating an enterprise campaign platform.**

### 1.5 More generous entry point than Bitly

Bitly's published free plan currently includes five links per month. Lixrl can offer guest shortening plus two signed-in creations per day and still maintain reasonable abuse controls. This is enough generosity for students, open-source projects, and small applications to build a habit before upgrading.

The advantage depends on explaining limits correctly. “Two links per day” is easier to understand than an undisclosed lifetime cap, and “50 active links” is healthier than permanently counting every link a customer has ever created.

### 1.6 Focused, comparatively calm UX

The product avoids presenting campaign management, QR campaigns, landing pages, integrations, and enterprise administration before the user has created a link. The current landing page has a clear hierarchy, a visible product action, and a static visual that does not compete with the form.

This simplicity is strategically valuable. It should be preserved as richer capabilities arrive by placing advanced options behind progressive disclosure rather than expanding the initial form into a control panel.

### 1.7 Sensible privacy direction

The guest fingerprint design uses a server secret and coarse request metadata instead of creating a permanent guest account. Raw IP addresses are not intentionally retained. These are good foundations for privacy-conscious abuse prevention.

The direction is stronger than the current wording and implementation details; correcting those inconsistencies can turn privacy from a disclaimer into a meaningful differentiator.

---

## 2. Gaps, risks, and competitive weaknesses

This section preserves the original finding and evidence so reviewers can
audit the remediation. The status callout under each heading is the current
state on PR #23; prose after the callout describes the condition found at
revision `9a02e83` unless explicitly stated otherwise.

### 2.1 Authentication and authorization — remediated

**PR #23 outcome:** OAuth payload logging and unused provider-token storage
were removed, D1 is authoritative for sessions, and API-key write scopes are
enforced on mutation routes. The production OAuth client secret still needs to
be rotated if the old exchange path ever ran there.

| Gap | Evidence | Product impact | Severity |
|---|---|---|---|
| OAuth client secret is logged | `lib/auth.ts` logs the complete token-exchange payload | Production logs may contain a reusable application secret | Critical |
| Destination updates bypass Safe Browsing | `app/api/urls/[code]/route.ts` validates syntax but does not run the creation-time safety check | A safe link can later be changed to a malicious destination | Critical |
| API-key scopes are not enforced | `lib/auth.ts` selects `ak_scopes` but returns only a user; mutation routes do not inspect scope | A nominally read-only key can write or delete data | High |
| Session cache can outlive D1 expiry | A KV hit loads the user without checking the authoritative session record | Expired or revoked sessions may remain usable through cached state | High |
| OAuth tokens are stored directly in D1 | `app/api/auth/callback/route.ts` stores access and refresh tokens | A database disclosure exposes reusable identity credentials | High |

The OAuth logging must be treated as an incident-prevention task, not ordinary cleanup. If the affected exchange path has run in production, the client secret should be rotated after the log is removed.

API scopes currently create a dangerous false sense of security. Until enforcement ships, the UI and documentation should state that every key has full access. The best end state is an authenticated principal containing the user, key ID, and granted scopes, with a common authorization helper applied to every endpoint.

### 2.2 Redirect expiry — remediated

**PR #23 outcome:** cached redirects now carry expiry, reject expired cache
hits, avoid KV caching inside its 60-second minimum TTL, and are invalidated or
rewritten when the destination, activation state, or expiry changes.

The cached redirect record contains the destination and database ID, but not its expiry. The fast path redirects without consulting D1. When an existing link is updated, the cache is rewritten without a matching expiration TTL. The slow-path calculation also enforces a minimum 60-second TTL, allowing a link close to expiry to remain cached beyond its intended lifetime.

This breaks a central product contract. A customer using an expiring link for a private event, limited offer, document, or incident response expects the link to stop working at the requested time.

**Required behaviour:**

- Cached records include `expires_at` and `is_active`.
- Every cache hit rejects a past expiry.
- Cache TTL never exceeds the remaining link lifetime.
- Destination, activation, and expiry changes invalidate or atomically replace cached state.
- Automated tests cover create, update, deactivate, expire, and reactivate sequences.

### 2.3 Paid-plan promises — remediated in purchase surfaces

**PR #23 outcome:** branded domains, webhook delivery, team seats, and
unenforced per-minute rates were removed from pricing and subscription
benefits. Reserved entitlement fields remain in code but are explicitly barred
from marketing until their product paths exist.

The plan model and pricing UI advertise branded domains, webhook delivery, team seats, and tier-specific API request rates. Branded-domain routing and team management do not exist, outbound product webhooks are explicitly documented as coming soon, and most API routes use fixed limits rather than the advertised tier limits.

This is the largest commercial trust gap. A buyer can pay for a plan based on a capability that cannot be used after checkout.

**Current claim mismatches include:**

- Branded domains shown on pricing and subscription pages but not implemented.
- Webhook delivery shown as a paid benefit while the docs say “Coming soon.”
- Business seats included in plan definitions without invitations, membership, or roles.
- API rates of 60/600/6,000 per minute advertised while URL creation uses a fixed 30-per-minute IP limit.
- Landing-page PNG QR export claim while the UI downloads SVG only.
- “Under 50ms worldwide” presented without public measurements or an SLO.

The short-term correction is to label unshipped capabilities clearly or remove them from checkout. The long-term correction is an entitlement registry used consistently by pricing, UI, API enforcement, and documentation.

### 2.4 Free-user daily allowance — remediated

**PR #23 outcome:** signed-in Free accounts receive two creations per UTC day
through an atomic D1 ledger. The dashboard shows live usage and reset time;
risk metadata is keyed and pseudonymous, and failed link inserts release the
claimed slot.

The guest rule—one link per rolling 24 hours—is implemented. The signed-in free allowance—two links per day with a risk-aware IP and metadata mechanism—is not. The dashboard displays it as a planned allowance, while the server applies a 25-link lifetime total.

A lifetime total is poor packaging for a recurring product. It eventually punishes loyal users even if their creation rate is low. It also compares poorly with competitors that publish monthly creation allowances.

The quota model should distinguish:

- Creation velocity: links created per day or month.
- Active inventory: currently enabled persistent links.
- API velocity: requests per minute.
- Analytics window: how far back detailed data can be queried.
- Storage retention: when underlying click records are actually deleted.

### 2.5 Documentation contracts — mostly remediated

**PR #23 outcome:** key format/hash/scopes, error bodies, analytics defaults,
query windows, storage shape, plan values, campaign metadata, and bulk-create
behaviour now describe the implementation. The next step is generating and
testing these contracts from an OpenAPI specification.

The documentation surface is visually substantial, but several statements do not match runtime responses:

- The error reference promises stable machine-readable codes and a human-readable message; most endpoints return a single `error` string.
- Analytics documentation has described time windows and grouping that differ from the daily SQL aggregation and seven-day default.
- API-key documentation acknowledges that scopes are not active while the landing page advertises scoped keys.
- Product documentation mentions bulk operations more broadly than the available bulk-delete endpoint.
- “Analytics retention” describes query access, while old click rows are not automatically removed.

Developer trust depends more on examples matching production than on documentation volume. Contract tests should generate or validate examples from the same schemas used by the API.

### 2.6 Privacy and data lifecycle — partially remediated

**PR #23 outcome:** guest, quota, network, and daily visitor identifiers now
use Web Crypto HMACs. The policy describes individual events, daily visitor
rotation, guest cleanup, and the current analytics deletion trigger. The
remaining gap is scheduled deletion for accounts that never reopen analytics.

The privacy page says IP information is “hashed, masked.” `hashIp` masks IPv4 addresses to a `/16`-style value and IPv6 to a coarse prefix, but does not cryptographically hash the result. The click table stores individual events; plan retention limits restrict query windows but do not prune old records.

These differences create avoidable policy risk:

- Describe the value as a truncated network prefix if that is what is stored.
- If stable pseudonymous uniqueness is needed, use a keyed hash of a normalized prefix and rotate the key on a documented schedule.
- Define whether analytics retention means visibility, raw-event storage, or both.
- Add scheduled deletion or aggregation if the public policy promises deletion.
- Publish what country, referrer, browser, device, and network data is stored and for how long.

### 2.7 Abuse response — operational foundation shipped

**PR #23 outcome:** visitors can submit rate-limited reports, reports enter an
indexed D1 queue, administrators can review them, and quarantine immediately
disables D1 redirects and clears KV. Notifications, appeals, reputation
signals, and a documented response SLA remain.

Public shorteners attract phishing, malware, spam, automated scanning, and brand impersonation. Google Safe Browsing is useful but currently fails open when it is unavailable and does not cover destination edits. No public report-abuse entry point or moderation console is present.

Risk scoring should support abuse decisions, not silently become identity. A complete system needs:

- Report-abuse form attached to every `lixrl.com/{code}` investigation path.
- Quarantine and disable states with a reason and audit history.
- Destination rechecks on create and update.
- Domain reputation, creation velocity, repeated destination, and redirect-chain signals.
- A human review queue for disputed or high-impact links.
- Takedown response targets and an appeal route.
- Metrics for blocks, false positives, repeat actors, and report resolution time.

Pastebin's mature product visibly includes reporting and abuse-related restrictions. Lixrl does not need Pastebin's content system, but it does need comparable operational readiness for links.

### 2.8 Guest failure handling and cleanup — remediated

**PR #23 outcome:** a failed guest-link write releases only its exact quota
claim. Successful guest creation schedules removal of expired guest links and
completed quota records outside the response path.

The guest quota is claimed before the guest-link insert and the two writes are not one D1 transaction or batch. If link creation fails after the claim, the visitor may lose the allowance without receiving a link. Expired guest links and old quota records also have no scheduled cleanup path.

The guest workflow should be idempotent for retryable failures, and cleanup should prevent unbounded storage growth.

### 2.9 Onboarding and conversion — partially remediated

**PR #23 outcome:** safe same-origin return paths survive OAuth, pricing intent
returns to pricing, and stale cookies no longer create a login loop. Guest-link
claiming after account creation remains the most important conversion gap.

The pricing page sends a `return_to=/pricing` parameter to login, but the login route does not retain it and the callback always sends users to `/dashboard`. This interrupts checkout intent. A stale session cookie can also create a redirect loop: middleware sees the cookie and leaves login, while server-side validation rejects the underlying session.

Other conversion gaps:

- The guest success state should make “keep this link” the primary account CTA.
- Account creation should preserve the newly created guest link when feasible.
- Pricing should show concrete units—per day, per month, active links—not ambiguous totals.
- Upgrade prompts should identify the exact unlocked task, such as “Connect your domain,” rather than only “Upgrade to Pro.”

### 2.10 Analytics trust signals — partially remediated

**PR #23 outcome:** common bots and preview agents are filtered from customer
metrics; the API exposes human clicks, filtered bots, and approximate unique
visitor-days; dashboards and CSV exports apply the same filter; raw events are
pruned to plan windows when analytics are accessed.

Lixrl records useful country, browser, device, referrer, and timeline dimensions. It does not yet visibly distinguish total from unique clicks, filter bots, disclose unknown-location behaviour, or show measurement confidence. Bitly markets real-time unified analytics, UTM support, and device/location dimensions; these are established expectations in paid link management.

Adding more charts before improving measurement quality would be the wrong order. First define what a click means, exclude known scanners, identify unique visits using a privacy-conscious method, and document update latency.

### 2.11 Reliability evidence — partially remediated

**PR #23 outcome:** unmeasured sub-50ms and real-time claims were removed,
health responses now report D1/KV/total probe latency, and a repository check
guards edge runtimes, Node imports, credential logs, and migration ordering.
The current CI workflow fails before starting a job, so a real Pages build and
runtime integration tests are still release blockers.

“Under 50ms worldwide” is precise enough to be testable, but the product does not expose a latency dashboard, regional percentiles, redirect success rate, or status history. There is also no automated test runner in the repository, and the redirect/cache/auth/billing paths rely on manual verification.

Before using the latency claim as a headline:

- Measure redirect latency from multiple regions.
- Publish p50, p95, and p99 rather than only a best-case threshold.
- Track redirect success, D1 fallback rate, KV hit rate, analytics write failure, and safety-check health.
- Add alerting for elevated redirect errors and billing-webhook failures.

### 2.12 Competitive workflows — partially remediated

**PR #23 outcome:** link creation now supports campaign labels, searchable
tags, UTM composition, 25-item bulk creation with row outcomes, CSV metadata,
and SVG/PNG QR export. Custom domains remain the clearest missing paid feature;
teams and advanced routing should follow only after domain routing is stable.

Lixrl should not copy Bitly indiscriminately, but several missing capabilities directly affect paid conversion:

| Capability | Bitly expectation | Lixrl status | Strategic value |
|---|---|---|---|
| Custom domains | Core paid capability | Not shipped; removed from paid claims | Very high |
| UTM builder and campaigns | Available in paid workflows | UTM composition and campaign labels shipped in PR #23 | High |
| Link redirects/editing | Mature workflow | Editing and update-time safety checks shipped | High |
| Bulk creation/import | Available on higher plans | 25-item API shipped; CSV import remains | Medium-high |
| Tags/folders | Organization at scale | Searchable tags shipped; folders remain | Medium |
| Dynamic QR formats | PNG/JPEG/SVG and customization | Styled SVG and PNG shipped; JPEG remains | Medium |
| Integrations | Broad ecosystem | Elixpo Blogs only | Medium |
| Device/location routing | Higher-plan capability | Missing | Later |
| Landing/link-in-bio pages | Included by Bitly | Missing | Later |
| Team roles | Business expectation | Not shipped; seat claims removed | High for Business |

Paste hosting, syntax highlighting, and raw text endpoints are intentionally excluded from this table. Those are Pastebin's category, not necessary gaps in a URL shortener.

---

## 3. Improvement plan and target product

### 3.1 Product position to pursue

**Recommended position:**

> Fast, privacy-conscious short links for developers and small teams—one click to try, a clean API when you are ready to build.

This position uses advantages Lixrl can credibly own:

- Faster time to first link than a campaign suite.
- Clear, public limits.
- Edge-native redirect infrastructure.
- Strong API and documentation.
- Privacy-conscious analytics with explicit retention.
- Custom domains without enterprise-level interface complexity.

Avoid claiming absolute superiority or a global latency number until measurements are published. Avoid competing with Pastebin through paste storage unless it becomes a separate product with dedicated moderation and data policies.

### 3.2 P0: secure and make promises truthful

**Status:** implemented in PR #23 except production secret rotation, migration
deployment, and build/runtime verification. Those three checks remain release
gates before the next paid acquisition campaign.

1. Remove the OAuth payload log and rotate `ELIXPO_CLIENT_SECRET` if production logs may contain it.
2. Run destination safety checks on both create and update.
3. Make expiry and activation authoritative across KV and D1.
4. Enforce API-key scopes or temporarily remove scope selection and scoped-key marketing.
5. Bind cached sessions to their real expiry and authoritative revocation state.
6. Stop storing OAuth access/refresh tokens if unused; otherwise encrypt and minimize them.
7. Remove branded domains, seats, outbound webhooks, and unenforced API rates from checkout until shipped, or mark them clearly as planned and non-billable.
8. Implement one stable API error envelope, for example:

   ```json
   {
     "error": {
       "code": "slug_taken",
       "message": "The requested short code is already in use.",
       "request_id": "req_..."
     }
   }
   ```

9. Correct the privacy page and define real deletion periods.
10. Add a public abuse report and an internal disable/quarantine workflow.

**Exit criteria:**

- No secret values appear in application logs.
- Read-only keys receive `403` from every mutation endpoint.
- Expired or disabled links never resolve from KV.
- Updated destinations receive the same safety treatment as new links.
- Every checkout feature is usable immediately after purchase.
- Public docs match sampled production responses.

### 3.3 P1: complete the free-to-paid product loop

**Status:** the two-per-day allowance, live dashboard counter, searchable
campaign metadata, UTM composition, and bulk-create API are implemented. Guest
link claiming and custom domains remain the highest-value product work.

#### Quotas and packaging

- Guest: one anonymous link per rolling 24 hours; link expires after 24 hours.
- Free account: two creations per rolling 24 hours, up to 50 active links, basic click totals, seven days of detailed analytics.
- Pro: one custom domain, custom slugs, expiry, 1,000 creations per month, 90-day analytics, UTM campaigns, full QR export, API, and signed webhooks.
- Business: multiple domains, team roles, one-year analytics, higher API quotas, bulk workflows, and audit logs.

Use D1 as the authoritative quota ledger. IP, browser family, locale, and risk metadata can adjust review or throttling, but should not silently merge unrelated people behind a shared network. Provide a clear retry time when a quota is exhausted.

#### Guest conversion

- After a guest link is created, make “Create an account to keep this link” the main next action.
- Carry the guest code through OAuth state and claim it for the new account after successful login.
- Preserve `return_to` through login and callback.
- Show the exact expiration time in the visitor's timezone and UTC.
- Email or surface a warning before a claimed link expires, if the account plan permits expiry.

#### Custom domains

Custom domains should be the first major paid feature because they create visible value on every click and are a standard Bitly expectation.

Minimum complete workflow:

- Add a domain and display exact DNS records.
- Verify ownership and certificate readiness.
- Choose a default domain per account.
- Resolve domain-plus-code without collisions.
- Show verification and propagation status.
- Prevent domain takeover after removal or account downgrade.
- Preserve a fallback `lixrl.com` link where appropriate.

#### Campaign organization

- Add tags and folders before building a complex campaign model.
- Add a UTM builder with reusable presets.
- Allow filtering by domain, status, tag, created date, and owner.
- Support CSV import/export and bulk creation with row-level errors.

### 3.4 P1: improve analytics quality before breadth

**Status:** bot filtering, approximate unique visitor-days, consistent filtered
queries/exports, and access-triggered retention pruning are implemented. The
remaining work is validation, scheduled cleanup, dashboard definitions, and
production measurement.

Define and display:

- Total redirect attempts.
- Accepted human clicks.
- Filtered bot/scanner clicks.
- Approximate unique visitors.
- Unknown/withheld geography.
- Data freshness and analytics timezone.

Use documented bot heuristics and privacy-preserving uniqueness rather than presenting raw event counts as exact human engagement. Add comparison periods, top referrers, UTM breakdowns, and export only after the underlying definitions are stable.

**Analytics success metrics:**

- Analytics write success above 99.9%.
- Dashboard freshness under five minutes, with the actual target displayed.
- Bot classification coverage reported internally.
- Raw events deleted or aggregated according to the published plan window.
- Every chart reconciles with the downloadable data for the same filters.

### 3.5 P1: establish reliability and test coverage

**Status:** this is now the immediate release blocker. PR #23 adds static edge
auditing and measurable health probes, but the repository CI workflow currently
fails before creating a quality job and the branch has not received a real
Next.js or Cloudflare Pages build.

Create an automated test layer around the behaviours most likely to damage trust:

- Guest claim, retry, expiry, and cleanup.
- Custom-code collision and retry.
- Destination validation and safety checks on create/update.
- Active, inactive, expired, and deleted redirect behaviour with warm and cold caches.
- Session expiry, logout, OAuth state, and `return_to`.
- API scope enforcement.
- Plan quota boundaries and downgrade behaviour.
- Billing webhook idempotency and signature failure.
- Stable error envelopes.

Add production monitoring for redirect p50/p95/p99, redirect error rate, KV hit rate, D1 fallback, scheduled analytics failures, Safe Browsing availability, webhook failures, guest quota denials, and abuse reports. Publish a small status page before making hard latency claims.

### 3.6 P2: developer platform depth

After the product contract is stable:

- Publish an OpenAPI 3.1 specification.
- Generate examples from the specification so docs cannot drift.
- Add idempotency keys to create operations.
- Add signed outbound webhooks with retry history and replay.
- Offer a webhook test event from the dashboard.
- Publish small JavaScript/TypeScript and Python examples rather than maintaining large SDKs initially.
- Add per-key last-used time, permissions, expiry, rotation, and request logs.
- Expand integrations only where users already create links repeatedly.

The Elixpo Blogs integration is a reasonable starting point. The next integrations should be selected from observed usage, not copied from Bitly's catalog.

### 3.7 P2: teams and advanced routing

Team seats should ship as a complete permission system rather than a numeric plan claim:

- Owner, administrator, editor, and viewer roles.
- Invitations and verified membership.
- Link ownership and transfer.
- Domain-level permissions.
- Audit history for sensitive changes.
- Safe removal and account downgrade behaviour.

Geographic/device routing and deep-link behaviour can follow once custom domains and analytics are reliable. These features increase redirect-path complexity and should not precede correctness of ordinary redirects.

### 3.8 Landing page and dashboard UX updates

Preserve the current simple hero, then improve proof and conversion:

- Replace the synthetic analytics artwork with a polished static product composition that uses real UI language and remains decorative.
- Keep the shortening input full width on large screens.
- Show a real response-time measurement only after telemetry exists.
- Add a concise trust row: expiry, abuse screening, privacy, and edge delivery.
- Demonstrate three concrete workflows: guest link, custom-domain link, and API-created link.
- Replace references to unfinished capabilities with shipped benefits.

For the dashboard:

- Make “Create link” the dominant action.
- Show free daily allowance and next reset time.
- Provide status, tag, domain, and date filters.
- Use accessible status colours with text/icon redundancy.
- Keep advanced analytics and QR controls inside the link detail page.
- Explain locked functionality at the point of use, with the exact plan benefit.

### 3.9 Documentation quality bar

Each endpoint should document:

- Authentication and required scope.
- Plan availability and enforced quota.
- Request schema with nullability and length limits.
- Successful response schema.
- Stable errors and retry behaviour.
- Idempotency behaviour.
- One tested cURL example.
- Cache/consistency implications where relevant.

Add conceptual pages for link lifecycle, expiry semantics, redirect caching, analytics definitions, privacy and retention, custom-domain setup, abuse reporting, rate limits, and webhook delivery. “Copy for LLM” should be generated from the same canonical source as the rendered documentation.

### 3.10 Outcome metrics and review gates

Track the roadmap through product outcomes rather than shipped screens:

| Area | Metric | Initial target |
|---|---|---|
| Acquisition | Landing visitor to successful guest link | Measure baseline, then improve by 20% |
| Activation | Guest creator who registers within 24 hours | 8–12% |
| Reliability | Successful redirects | At least 99.99% |
| Performance | Global redirect p95 | Publish measured target before advertising |
| Safety | Confirmed malicious-link median disable time | Under 30 minutes after verified report |
| API | Non-2xx rate excluding client validation | Under 0.5% |
| Conversion | Activated free account to paid | Establish cohort baseline before changing price |
| Retention | Four-week active creator retention | Track by guest, free, and paid cohorts |
| Documentation | Sample requests matching documented schema | 100% in contract tests |
| Trust | Paid features available immediately after checkout | 100% |

### 3.11 Recommended execution order

The immediate focus should be **release confidence, then custom domains**. Do
not add another large surface until the remediation branch is proven on the
actual edge runtime.

| Order | Focus | Definition of done |
|---|---|---|
| 1 | Repair CI and validate PR #23 | Quality workflow creates jobs; TypeScript, test, Next build, and `pages:build` pass |
| 2 | Deploy safely | Migrations 0005–0009 apply through the merged deployment; OAuth secret rotated; redirect/auth/quota/abuse smoke tests pass |
| 3 | Production observability | Redirect success, p50/p95/p99, KV hit rate, D1 fallback, analytics failures, and abuse queue age are visible with alerts |
| 4 | Custom domains | Ownership verification, DNS guidance, certificates, routing, collision isolation, removal, and downgrade safety work end to end |
| 5 | Guest-to-account claiming | A guest can sign in and retain the exact link securely; conversion and failure rates are measured |
| 6 | Scheduled lifecycle jobs | Click, guest, quota, session, and abuse data are pruned independently of dashboard traffic |
| 7 | API contract maturity | OpenAPI 3.1, contract tests, idempotent creates, generated examples, and stable machine-readable errors ship together |
| 8 | Abuse operations | Reviewer notifications, response SLA, appeals, reputation signals, and repeat-actor controls are operational |
| 9 | Analytics validation | Bot false positives, unique-count semantics, freshness, timezone, and export reconciliation are measured and documented |
| 10 | Teams and routing | Roles, invitations, ownership transfer, audit history, then geo/device routing—only after custom domains are stable |

**Recommended next sprint:** complete items 1–3 only. They turn a large security
and product patch into a safe release and create the evidence needed to decide
whether custom domains or conversion work produces the better commercial
return. After release confidence, custom domains should be the next feature:
they are visible to every paid customer's audience, create a clear upgrade
reason, and close the most important direct gap with Bitly.

### Competitive references

- [Bitly URL Shortener](https://bitly.com/pages/products/url-shortener)
- [Bitly Pricing](https://bitly.com/pages/pricing)
- [Bitly link creation workflow](https://support.bitly.com/hc/en-us/articles/230897128-How-do-I-create-links-with-Bitly)
- [Bitly link expiration behaviour](https://support.bitly.com/hc/en-us/articles/360002288272-Will-the-links-I-create-on-Bitly-ever-expire)
- [Pastebin FAQ](https://pastebin.com/faq)
- [Pastebin API documentation](https://pastebin.com/doc_api)
- [Pastebin PRO comparison](https://pastebin.com/pro)
