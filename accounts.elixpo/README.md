<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=180&section=header&text=Elixpo%20Accounts&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=One%20login%20for%20everything%20Elixpo&descAlignY=62&descAlign=50" width="100%" alt="Elixpo Accounts" />

<br/>

<img src="https://raw.githubusercontent.com/elixpo/accounts.elixpo/main/public/og-image.png" alt="Elixpo Accounts" width="720"/>

<br/><br/>

[![License](https://img.shields.io/github/license/elixpo/accounts.elixpo?style=flat-square&color=blue)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/elixpo/accounts.elixpo?style=flat-square&color=informational)](https://github.com/elixpo/accounts.elixpo/commits/main)
[![Issues](https://img.shields.io/github/issues/elixpo/accounts.elixpo?style=flat-square&color=yellow)](https://github.com/elixpo/accounts.elixpo/issues)
[![Stars](https://img.shields.io/github/stars/elixpo/accounts.elixpo?style=flat-square&color=gold)](https://github.com/elixpo/accounts.elixpo/stargazers)

</div>

---

## What is this?

**Elixpo Accounts** is your single login for every Elixpo product — chat, art, blogs, sketch, the URL shortener, and anything else we build.

Make one account here, and you're signed in everywhere. No separate passwords. No juggling logins.

For your everyday use, you don't need to touch this repo at all — just go to **[accounts.elixpo.com](https://accounts.elixpo.com)** and sign up.

---

## What can I do with my account?

- **Sign in once.** Use your Elixpo account on any Elixpo site without making a new login.
- **Choose how to sign in.** Email + password, Google, or GitHub — pick whichever you prefer.
- **Manage your profile in one place.** Update your display name, picture, and bio. Every Elixpo product stays in sync.
- **See which apps you've connected.** Visit your dashboard to view and remove app access whenever you want.
- **Delete your account properly.** One click here removes you from every Elixpo product — no orphaned data left behind.

---

## I'm a developer — can I let users sign in with Elixpo?

Yes. Anyone can register an app and add a "Sign in with Elixpo" button on their site.

1. Sign in at [accounts.elixpo.com](https://accounts.elixpo.com).
2. Open the dashboard → **OAuth Apps** → register a new app.
3. Follow the integration guide: **[docs/OAUTH_INTEGRATION.md](docs/OAUTH_INTEGRATION.md)**.

You also get webhook events (like "user deleted their account") so your app can stay in sync automatically.

---

## Want to help build it?

This is open source. Pull requests are welcome.

If you want to run it on your machine or send a change, here's the short version:

```bash
git clone https://github.com/elixpo/accounts.elixpo.git
cd accounts.elixpo
npm install
cp .env.example .env.local       # fill in the blanks
npm run db:migrate:local         # set up the local database
npm run dev                      # open http://localhost:3000
```

For the full developer manual — architecture, conventions, what to do and what to avoid — read **[AGENTS.md](AGENTS.md)**.

---

## Found a bug? Have an idea?

Open an issue → **[github.com/elixpo/accounts.elixpo/issues](https://github.com/elixpo/accounts.elixpo/issues)**.

For security issues, please email us privately instead of opening a public issue.

---

<div align="center">

Made with care by the **[Elixpo](https://github.com/elixpo) Open Source Team**.

</div>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&reversal=false" width="100%" alt="wave footer"/>
