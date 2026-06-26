# Elixpo Status

**The live health page for everything Elixpo.** → [status.elixpo.com](https://status.elixpo.com)

This is the page you check when you want to know, at a glance, whether Elixpo's
services are working right now. Think of it like the "Is it down?" board you'd
see for any big online product — green means everything's fine, amber means
something's slow, red means something's broken.

## What it shows you

- **Every Elixpo service in one place** — the main site plus Blogs, Sketch,
  Accounts, Payouts, Mail, Portfolio and more.
- **A simple health label for each one:**
  - 🟢 **Operational** — working normally.
  - 🟠 **Degraded performance** — running, but with some errors or slowness.
  - 🔴 **Outage** — significant problems right now.
  - ⚪ **No traffic** — nobody's using it at the moment, so there's nothing to report.
- **90 days of history** — a bar showing how reliable the platform has been over
  the last three months, so you can see good days and bad days at a glance.
- **Recent changes** — a short list of the latest updates and fixes.

## Where the numbers come from

The status is measured automatically from real visitor traffic at Cloudflare's
network (the layer that sits in front of every Elixpo service). When too many
requests come back as errors, the service is marked as degraded or down. There's
no manual switch to flip and no separate monitoring tool — the page reflects what
real users are actually experiencing.

This means the page is always honest and always up to date: it refreshes on its
own, and a new Elixpo service shows up here as soon as it goes live.

## Who runs this

Elixpo Status is maintained by the Elixpo team. If a service looks down and the
status page doesn't reflect it (or vice versa), reach out at
[hello@elixpo.com](mailto:hello@elixpo.com).

---

<sub>Built with Next.js and deployed on Cloudflare Pages. For developers: see
`wrangler.toml` for the deploy config and run `npm run pages:deploy` to publish.</sub>
