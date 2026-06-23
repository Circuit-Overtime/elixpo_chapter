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
- Price — a regional/PPP variant of a product in a currency. Each price has a type of one_time (manual re-purchase each cycle) or recurring (autopay mandate, billed automatically).
- Entitlement — the tier + expiry a customer currently holds.
- Subscription — for autopay prices, the recurring billing mandate. We manage the Razorpay subscription, the renewal charges, and emit entitlement.updated on every successful cycle.

## Billing modes

- One-time — buyer goes through Razorpay Checkout, pays once, gets entitlement for the price's interval (e.g. 30 days). Re-buying is manual.
- Autopay (recurring) — buyer goes through Razorpay's hosted mandate page (UPI Autopay or Card eMandate), and Razorpay charges them automatically each cycle. You receive entitlement.updated on every renewal.
Switch modes per price with the type field in your catalog JSON — no other change needed in your integration. See Catalog sync.

## Cancellation

For autopay prices, buyers can self-serve cancel from your app — see Checkout sessions → Cancelling. Graceful by default: access continues through the paid period, then the entitlement expires and you get a final entitlement.updated with active: false.
