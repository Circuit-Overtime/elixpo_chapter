# Privacy Policy

_Last updated: June 2026_

LixBlogs is a blogging platform operated by **Elixpo** (Ayushman Bhattacharya). This policy explains what we collect, how we use it, and how we keep it safe. Questions? Email **hello@elixpo.com**.

## Who we are

LixBlogs lets you read, write, and publish posts. Sign-in is handled by **Elixpo Accounts** via OAuth 2.0 — we never see or store your password.

## What we collect

- **Account details** from Elixpo Accounts: your username, display name, email, and avatar.
- **Content you create**: posts, drafts, titles, tags, comments, and organizations.
- **Activity signals**: views, reads, likes, claps, bookmarks, follows, and reposts — used to power your feed and author stats.

## How we use it

- Authenticate you and render your profile and posts.
- Personalize your "For you" feed and compute author analytics.
- Send transactional email only: login alerts, account actions, and an optional weekly digest. We do **not** send marketing spam.

## Images & media

Cover images, avatars, organization logos, and in-post images you upload are **compressed to WebP** in your browser and stored on **Cloudinary**, served over **HTTPS**. We store only the media you upload to power your posts and profile, and we do **not** embed third-party advertising or tracking pixels in your content. Deleting a post removes its associated media.

## Where your data lives

- **Text & metadata**: Cloudflare **D1** (database) and **KV** (cache).
- **Media**: **Cloudinary** (WebP, HTTPS).
- **Session**: an `httpOnly`, `Secure`, `SameSite=Lax` cookie — not readable by JavaScript.

## Open source & transparency

LixBlogs is open source. You can read exactly how your data is handled in the code at **[LixBlogs Open Source Code](https://github.com/elixpo/blogs.elixpo)**. Found a privacy concern? Open an issue or email us.

## Your choices

You can edit or delete your content anytime. **Account deletion and app revocation** are handled at [Connected Apps](https://accounts.elixpo.com/dashboard/services)


## Contact

- Questions about your data? Email **hello@elixpo.com**.
- Or leave us an issue at [Blogs Issues](https://github.com/elixpo/blogs.elixpo/issues/new)
