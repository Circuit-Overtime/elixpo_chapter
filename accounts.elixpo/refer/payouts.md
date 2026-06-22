# Elixpo Pay Docs — Overview

Source: https://payouts.elixpo.com/docs

This is one section of the Elixpo Pay developer documentation. Elixpo Pay is the payments and creator payouts platform for Elixpo.

---
# Elixpo Pay — Overview

Elixpo Pay is the payments and payouts layer for the Elixpo ecosystem, and an open SaaS for any developer. It abstracts providers behind one API plus a hosted checkout, a unified ledger, entitlement grants, and creator payouts.

## How it fits together

Your app never touches card data. Your server creates a checkout session with your secret key and redirects the buyer to our hosted checkout; we charge them through a provider (Razorpay for INR in P0), then grant an entitlement and tell your app about it two ways:

- a signed entitlement.updated webhook delivered to your app, and
- a pull endpoint, GET /v1/entitlements?app=&uid=, you can call any time.

## Core concepts

- Merchant — your tenant. You sign in with Elixpo Accounts.
- App — a project under your merchant (e.g. lixblogs), with its own API key.
- Product — a sellable tier (e.g. member).
- Price — a regional/PPP variant of a product in a currency.
- Entitlement — the tier + expiry a customer currently holds.

## P0 scope

The first release powers first-party billing for blogs.elixpo with Razorpay (INR), one-time orders that grant a 30-day entitlement. Stripe, true recurring subscriptions, creator payouts, and bring-your-own-keys multi-tenancy follow.
