"use client";

import {
    Code,
    DocH2,
    DocLead,
    DocList,
    DocP,
    DocTitle,
} from "@/components/docs-prose";
import { Box } from "@mui/material";
import CodeBlock from "../../components/code-block";

const CREATE = `POST https://payouts.elixpo.com/v1/checkout/sessions
Authorization: Bearer <ELIXPO_PAY_API_KEY>
Content-Type: application/json

{
  "tier": "member",                 // product tier to purchase
  "currency": "INR",                // we pick the matching catalog price
  "customer": {
    "uid": "u_123",                 // buyer id in your namespace
    "email": "buyer@example.com"    // optional, prefilled at checkout
  },
  "success_url": "https://blogs.elixpo.com/settings",
  "metadata": { "plan": "member" }  // optional, echoed onto the session
}`;

const RESPONSE = `201 Created
{
  "id": "cs_…",
  "url": "https://payouts.elixpo.com/checkout?session=cs_…",
  "amount": 19900,        // resolved from the catalog (minor units)
  "currency": "INR",
  "tier": "member",
  "expires_at": "2026-06-17T12:30:00.000Z"
}

// If the resolved price is a recurring tier (autopay), the hosted
// checkout page redirects the buyer to Razorpay's mandate URL
// (rzp.io/i/…) instead of opening the Checkout JS modal. You don't
// need to do anything different on your side — the same /v1/checkout/
// sessions call handles both modes; the price's "type" field decides.`;

const REDIRECT = `// In your app (server-side), when a user upgrades:
const res = await fetch("https://payouts.elixpo.com/v1/checkout/sessions", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.ELIXPO_PAY_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tier: "member",
    currency: "INR",
    customer: { uid: user.id, email: user.email },
    success_url: "https://blogs.elixpo.com/settings",
  }),
});
const session = await res.json();
redirect(session.url); // send the buyer to hosted checkout`;

export default function CheckoutDocs() {
    return (
        <Box>
            <DocTitle>Checkout sessions</DocTitle>
            <DocLead>
                Checkout starts when your server asks Elixpo Pay to create a
                session with your secret key. We resolve the price from your
                catalog, return a hosted checkout URL, and you redirect the
                buyer there. Your app never sees card data and never signs an
                amount.
            </DocLead>

            <DocH2>Create a session</DocH2>
            <CodeBlock code={CREATE} language="http" />
            <DocP>
                Authenticate with your <Code>ELIXPO_PAY_API_KEY</Code> (secret
                key). The <Code>amount</Code> is never sent by you — Elixpo Pay
                looks up the active price for <Code>(tier, currency)</Code> in
                your catalog, so a user can't tamper with the price.
            </DocP>

            <DocH2>Response</DocH2>
            <CodeBlock code={RESPONSE} language="json" />

            <DocH2>Redirect the buyer</DocH2>
            <CodeBlock code={REDIRECT} language="javascript" />

            <DocH2>What happens next</DocH2>
            <DocList
                items={[
                    "The hosted page loads the session, looks at the resolved price's billing mode (one-time or autopay), and runs the matching flow.",
                    <>
                        <strong>One-time</strong> — we lazily create a
                        Razorpay Order and open Razorpay Checkout. The
                        client signature is verified and we fulfill
                        immediately; the Razorpay webhook re-confirms
                        authoritatively (idempotent — never double-grants).
                    </>,
                    <>
                        <strong>Autopay (recurring)</strong> — we lazily
                        create a Razorpay Plan (cached per price) and a
                        Subscription, then redirect the buyer to
                        Razorpay's hosted mandate URL. Once they accept,{" "}
                        <Code>subscription.activated</Code> +{" "}
                        <Code>subscription.charged</Code> webhooks fire
                        and the entitlement is granted.
                    </>,
                    <>
                        We grant the entitlement, then notify your app
                        (see Webhooks) and redirect the buyer to{" "}
                        <Code>success_url</Code>. Each renewal charge
                        re-fires <Code>entitlement.updated</Code> so
                        your DB stays in sync.
                    </>,
                ]}
            />

            <DocH2>Cancelling a subscription</DocH2>
            <DocP>
                For autopay tiers your buyer can self-serve cancel from your
                app, which calls our cancel endpoint:
            </DocP>
            <CodeBlock
                code={`POST https://payouts.elixpo.com/v1/subscriptions/cancel
Authorization: Bearer <ELIXPO_PAY_API_KEY>
Content-Type: application/json

{
  "customer": { "uid": "u_123" },   // same uid passed at checkout
  "cancel_at_cycle_end": true        // default. false = stop billing now
}`}
                language="http"
            />
            <DocP>
                Graceful by default: the buyer keeps access through the
                period they already paid for, then auto-downgrades when
                the entitlement expires. We fire{" "}
                <Code>entitlement.updated</Code> with{" "}
                <Code>status: "cancelled"</Code> immediately so you can
                email the buyer; and again with <Code>active: false</Code>{" "}
                at period end so you can flip the tier.
            </DocP>
        </Box>
    );
}
