# LixBlogs — Platform Architecture Plan

## Overview

LixBlogs is a blogging platform built with **Next.js** (Cloudflare Pages), **Cloudflare Workers** (API), **D1** (database), **KV/Cache** (caching), and **R2** (media storage). Authentication is handled via **Elixpo Accounts OAuth 2.0** (see `login_plan.md`).

---

## 1. User & Organization Model

### Personal Accounts
- Every user has one personal account tied to their Elixpo Accounts identity
- Personal profile: display name, username (unique via bloom filter + D1 fallback), bio, avatar (R2), banner (R2)
- Each user can **own exactly one organization**
- Each user can be a **member of multiple organizations** (via invite)

### Organizations
- Created by a user (who becomes the owner)
- Has its own profile: org name, slug, description, logo (R2), banner (R2)
- Roles within an org: **owner**, **admin**, **editor**, **member**
- Owner can invite users, manage roles, publish under org name
- Org settings: visibility (public/private), default blog license, branding

---

## 2. Blog / Post Model

### Blog Properties
- `id` (uuid), `slug`, `title`, `subtitle`, `content` (stored as JSON block format for WYSIWYG)
- `cover_image` (R2 key), `tags[]`, `category`
- `author_id` (primary author), `co_authors[]` (array of user IDs)
- `published_as`: `"personal"` | `"org:<org_id>"` — determines if shown under user profile or org
- `status`: `draft` | `published` | `archived` | `unlisted`
- `created_at`, `updated_at`, `published_at`
- `read_time_minutes` (computed on save)
- `allow_comments`: boolean
- `license`: string (optional, inherits from org or user default)

### Co-authoring
- Primary author creates the blog and invites co-authors by username
- Co-authors can edit content (via collaborative editor — see section 5)
- All co-authors are displayed on the published blog
- Only primary author can delete or change `published_as`

### Publishing Context
- **Personal**: blog appears on the user's profile, attributed to the user
- **Organization**: blog appears on the org's page, attributed to author(s) within the org
- A user can only publish under an org they are a member of (editor+ role)

---

## 3. Authentication — Elixpo Accounts OAuth 2.0

Auth flow (per `login_plan.md`):

```
1. Frontend redirects to: https://accounts.elixpo.com/oauth/authorize
   ?response_type=code&client_id=...&redirect_uri=.../auth/callback&state=...&scope=openid profile email
2. Callback receives ?code=...&state=...
3. Worker exchanges code for tokens via POST /api/auth/token
4. Worker calls GET /api/auth/me with access_token to get user info
5. Worker creates a session (JWT stored in httpOnly cookie)
6. Refresh tokens rotated on each use (15min access, rotating refresh)
```

### Session Management (Worker)
- On successful OAuth callback, the Worker mints a session JWT (signed with a secret in Worker env)
- Session JWT stored in httpOnly, Secure, SameSite=Lax cookie
- Worker middleware validates session on protected routes
- Refresh logic: if access_token near expiry, use refresh_token to get new pair

### First-time Registration Flow
- After OAuth, if user has no LixBlogs profile in D1 → redirect to `/intro`
- User picks username (bloom filter check → D1 fallback if hit) and display name
- Profile row created in D1, bloom filter updated

---

## 4. Cloudflare Infrastructure

### Cloudflare Pages (Frontend)
- Next.js app deployed via `@cloudflare/next-on-pages`
- Static pages + edge SSR where needed
- Route structure matches `app/` directory

### Cloudflare Workers (API)
- All API routes under `/api/*`
- Handles auth, blog CRUD, user/org management, feed generation
- Bindings: D1 (database), R2 (media), KV (cache/sessions)

### D1 (SQLite Database)

#### Tables
```
users
  id TEXT PRIMARY KEY        -- from Elixpo Accounts user-uuid
  email TEXT UNIQUE
  username TEXT UNIQUE
  display_name TEXT
  bio TEXT
  avatar_r2_key TEXT
  banner_r2_key TEXT
  owned_org_id TEXT           -- nullable, FK to orgs
  created_at INTEGER
  updated_at INTEGER

orgs
  id TEXT PRIMARY KEY
  slug TEXT UNIQUE
  name TEXT
  description TEXT
  logo_r2_key TEXT
  banner_r2_key TEXT
  owner_id TEXT               -- FK to users
  visibility TEXT DEFAULT 'public'   -- public | private
  created_at INTEGER
  updated_at INTEGER

org_members
  org_id TEXT                 -- FK to orgs
  user_id TEXT                -- FK to users
  role TEXT                   -- owner | admin | editor | member
  joined_at INTEGER
  PRIMARY KEY (org_id, user_id)

blogs
  id TEXT PRIMARY KEY
  slug TEXT
  title TEXT
  subtitle TEXT
  content TEXT                -- JSON (WYSIWYG block format)
  cover_image_r2_key TEXT
  author_id TEXT              -- FK to users
  published_as TEXT           -- 'personal' | 'org:<org_id>'
  status TEXT DEFAULT 'draft' -- draft | published | archived | unlisted
  read_time_minutes INTEGER
  allow_comments INTEGER DEFAULT 1
  created_at INTEGER
  updated_at INTEGER
  published_at INTEGER

blog_co_authors
  blog_id TEXT
  user_id TEXT
  added_at INTEGER
  PRIMARY KEY (blog_id, user_id)

blog_tags
  blog_id TEXT
  tag TEXT
  PRIMARY KEY (blog_id, tag)

comments
  id TEXT PRIMARY KEY
  blog_id TEXT
  user_id TEXT
  parent_id TEXT              -- nullable, for nested replies
  content TEXT
  created_at INTEGER
  updated_at INTEGER

likes
  blog_id TEXT
  user_id TEXT
  created_at INTEGER
  PRIMARY KEY (blog_id, user_id)

bookmarks
  user_id TEXT
  blog_id TEXT
  collection TEXT DEFAULT 'default'
  created_at INTEGER
  PRIMARY KEY (user_id, blog_id)

follows
  follower_id TEXT
  following_id TEXT           -- can be user or org
  following_type TEXT         -- 'user' | 'org'
  created_at INTEGER
  PRIMARY KEY (follower_id, following_id, following_type)

read_history
  user_id TEXT
  blog_id TEXT
  read_at INTEGER
  read_progress REAL          -- 0.0 to 1.0
  PRIMARY KEY (user_id, blog_id)
```

### R2 (Media Storage)
- Bucket: `lixblogs-media`
- Key pattern: `users/{user_id}/avatar.webp`, `users/{user_id}/banner.webp`
- Org media: `orgs/{org_id}/logo.webp`, `orgs/{org_id}/banner.webp`
- Blog media: `blogs/{blog_id}/{filename}.webp`
- All images compressed to WebP server-side before storing (sharp or Worker-based)

### KV / Cache
- Session data (if not using JWT-only approach)
- Blog content cache (key: `blog:{slug}`, TTL: 5min)
- User profile cache (key: `user:{username}`, TTL: 10min)
- Feed cache per user (key: `feed:{user_id}`, TTL: 2min)
- Bloom filter binary (key: `bloom:usernames`)

---

## 5. Collaborative WYSIWYG Editor (Separate Plan)

- Notion-style block editor (e.g., Tiptap / BlockNote / custom)
- Real-time collaboration via Cloudflare Durable Objects or external CRDT service
- Block types: paragraph, heading, image, code, quote, callout, divider, embed, table
- Media uploads inline → R2
- Auto-save drafts every 30s
- Version history stored in D1 (snapshots)

---

## 6. Feed & Recommendation System

### Feed Algorithm
- User's feed = blend of:
  - Blogs from followed users/orgs (chronological weight)
  - Blogs matching user's read history tags (interest score)
  - Trending blogs (engagement velocity: likes + reads in last 24h)
  - Editorial / staff picks (manually curated flag on blog)

### Scoring Formula (simplified)
```
score = (recency_weight * time_decay)
      + (interest_weight * tag_overlap_with_history)
      + (engagement_weight * normalized_engagement)
      + (follow_weight * is_followed_author)
```

### Top Picks
- Curated by admin flag OR algorithmically: high engagement + high read completion rate
- Displayed in sidebar on `/feed`

### Implementation
- Worker cron (Cloudflare Cron Triggers) runs every 15min to pre-compute feeds
- Stores top 100 blog IDs per user in KV (`feed:{user_id}`)
- Client paginates from cached feed, falls back to real-time query if cache miss

---

## 7. API Route Plan (Workers)

```
Auth:
  GET  /api/auth/login          → redirect to Elixpo OAuth
  GET  /api/auth/callback       → handle OAuth callback, set session
  POST /api/auth/logout         → clear session
  GET  /api/auth/me             → current user info (from session)

Users:
  GET  /api/users/:username     → public profile
  PUT  /api/users/me            → update own profile
  POST /api/users/me/avatar     → upload avatar → R2
  POST /api/users/me/banner     → upload banner → R2
  GET  /api/users/:username/blogs → user's published blogs
  POST /api/users/check-username → bloom filter + D1 check

Orgs:
  POST /api/orgs                → create org (max 1 per user)
  GET  /api/orgs/:slug          → org profile
  PUT  /api/orgs/:slug          → update org (owner/admin only)
  POST /api/orgs/:slug/invite   → invite user (owner/admin)
  POST /api/orgs/:slug/members  → accept invite
  DELETE /api/orgs/:slug/members/:userId → remove member
  PUT  /api/orgs/:slug/members/:userId  → change role
  GET  /api/orgs/:slug/blogs    → org's published blogs

Blogs:
  POST /api/blogs               → create draft
  GET  /api/blogs/:slug         → read blog (public)
  PUT  /api/blogs/:id           → update blog (author/co-author)
  DELETE /api/blogs/:id         → delete blog (primary author only)
  POST /api/blogs/:id/publish   → publish blog
  POST /api/blogs/:id/co-authors → add/remove co-authors
  POST /api/blogs/:id/like      → toggle like
  GET  /api/blogs/:id/comments  → list comments
  POST /api/blogs/:id/comments  → add comment

Feed:
  GET  /api/feed                → personalized feed (paginated)
  GET  /api/feed/trending       → trending blogs
  GET  /api/feed/top-picks      → curated top picks

Library:
  GET  /api/library/bookmarks   → user's bookmarks
  POST /api/library/bookmarks   → bookmark a blog
  DELETE /api/library/bookmarks/:blogId → remove bookmark
  GET  /api/library/history     → read history

Stats (for authors):
  GET  /api/stats/overview      → total views, reads, likes, followers
  GET  /api/stats/blogs/:id     → per-blog analytics
  GET  /api/stats/monthly       → monthly breakdown
```

---

## 8. Frontend Route Map (Next.js App Router)

```
/                          → Landing page (marketing)
/intro                     → New user onboarding (pick username)
/feed                      → Personalized feed + trending + top picks
/profile                   → Own profile
/profile/:username         → Public user profile (future)
/settings                  → Account settings
/settings/notifications    → Notification preferences
/settings/publisher        → Publishing / org settings
/about                     → About page
/library                   → Bookmarks & collections
/library/history           → Read history
/library/saved             → Saved collections
/stats                     → Author analytics dashboard
/auth/login                → Login (redirects to Elixpo OAuth)
/auth/callback             → OAuth callback handler
/auth/register             → Registration flow
/write                     → Blog editor (future)
/blog/:slug                → Blog reader (future)
/org/:slug                 → Org profile page (future)
```

---

## 9. Migration Status

- [x] Migrated from Vite to Next.js (App Router)
- [ ] Replace Express backend with Cloudflare Workers
- [ ] Replace Firebase with Elixpo Accounts OAuth 2.0
- [ ] Replace Redis with Cloudflare KV
- [ ] Set up D1 database with schema
- [ ] Set up R2 bucket for media
- [ ] Implement blog CRUD API
- [ ] Implement org system
- [ ] Build WYSIWYG editor
- [ ] Implement feed/recommendation algorithm
- [ ] Deploy to Cloudflare Pages
