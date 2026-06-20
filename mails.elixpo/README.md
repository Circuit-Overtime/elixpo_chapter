<p align="center">
  <img src="public/og-image.png" alt="Elixpo Mails" width="100%" />
</p>

<h1 align="center">Elixpo Mails</h1>

<p align="center">
  <b>Branded transactional email, triggered by your product's events — sent from your own mailbox.</b>
</p>

<p align="center">
  <a href="https://mails.elixpo.com">mails.elixpo.com</a> &nbsp;·&nbsp;
  <a href="https://mails.elixpo.com/docs">Documentation</a>
</p>

---

## What is Elixpo Mails?

Elixpo Mails helps a business send the everyday emails its product needs to send —
**receipts, welcome notes, order updates, password resets, invoices** — beautifully
designed, on-brand, and sent **automatically** when something happens in their app.

No mail server to run. No email HTML to hand-write. No shared "noreply@" address —
the emails go out from **your own** mailbox, so they look like they came from you.

## Who it's for

Any business or team that wants reliable, professional transactional email without
standing up a whole email platform. If your app needs to email a customer when they
sign up, pay, or place an order — this is for you.

## Why it's different

- **📤 Your own sender.** Connect your Gmail, Google Workspace, or any SMTP mailbox.
  Emails are sent *as you*, not from a shared pool — better trust and deliverability.
- **🎨 Design without code.** A visual editor (like writing a document) with
  `{{placeholders}}` for the bits that change per customer — names, amounts, links.
- **🏷️ On-brand by default.** Each product carries its own logo, address, phone, and
  footer, added to every email automatically.
- **📎 Attachments.** Attach a file from Google Drive, a link, or a per-send variable
  (e.g. each customer's own invoice).
- **🔕 Unsubscribe handled for you.** Built-in one-click unsubscribe and a suppression
  list, so you stay compliant without building anything.
- **📊 See every send.** A delivery log shows exactly what went out, to whom, and
  whether it landed.

## How it works — in four steps

1. **Connect a sender** — add the mailbox your emails should come from.
2. **Create a product** — this represents one of your services and holds its
   credentials and branding.
3. **Design a template** — write the email once, with `{{variables}}` for the
   personalized parts.
4. **Add a webhook** — your app calls a single secure URL when an event happens, and
   Elixpo Mails renders the template with that customer's details and sends it.

That's it — your product now sends polished, branded email on autopilot.

## Built on

Elixpo Mails runs entirely on Cloudflare's edge network for speed and reliability,
and signs in through **Elixpo Accounts**. It's part of the Elixpo suite of products.

## For developers

The full API reference — authentication, the trigger endpoint, templates, variables,
attachments, and unsubscribe — lives at **[mails.elixpo.com/docs](https://mails.elixpo.com/docs)**
(with a one-click "Copy for LLM" button).

---

<p align="center"><sub>© 2024–2026 Elixpo Mails · Sent with care.</sub></p>
