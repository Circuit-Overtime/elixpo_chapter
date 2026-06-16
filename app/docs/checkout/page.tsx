"use client";

import { Box } from "@mui/material";
import CodeBlock from "../../components/code-block";
import { Code, DocH2, DocLead, DocList, DocP, DocTitle } from "@/components/docs-prose";

const TOKEN = `HANDOFF = base64url(JSON(payload)) + "." + HMAC_SHA256_hex(secret, body)

payload = {
  app:      "lixblogs",   // app slug (must match a registered app)
  plan:     "member",     // product tier being purchased
  uid:      "u_123",      // buyer id in your namespace
  currency: "INR",
  amount:   19900,        // minor units — authoritative
  return:   "https://blogs.elixpo.com/pricing",
  email:    "buyer@x.com",// optional, prefilled
  iat:      1718500000,
  exp:      1718501800    // short-lived (e.g. +30 min)
}`;

const URL = `https://payouts.elixpo.com/checkout?token=<HANDOFF>`;

export default function CheckoutDocs() {
    return (
        <Box>
            <DocTitle>Checkout handoff</DocTitle>
            <DocLead>
                Checkout starts when your app redirects a user to Elixpo Pay with a
                signed handoff token. We verify it, create a provider order, and
                render the hosted payment page.
            </DocLead>

            <DocH2>The redirect</DocH2>
            <CodeBlock code={URL} language="text" />
            <DocP>
                You may append human-readable <Code>app</Code>, <Code>plan</Code>,
                <Code>uid</Code> params for your own logs, but only the token is
                trusted — a user cannot tamper with the amount.
            </DocP>

            <DocH2>Token format</DocH2>
            <CodeBlock code={TOKEN} language="text" />
            <DocP>
                <Code>secret</Code> is the shared <Code>ELIXPO_PAY_HANDOFF_SECRET</Code>.
                The token must be unexpired (<Code>exp</Code>) and carry a non-zero
                amount and currency.
            </DocP>

            <DocH2>What happens next</DocH2>
            <DocList
                items={[
                    <>We resolve the app, product (by <Code>plan</Code>) and price (by <Code>currency</Code>), upsert the customer, and create a checkout session.</>,
                    <>A Razorpay order is created and the hosted page opens Razorpay Checkout.</>,
                    <>On success, the client signature is verified and we fulfill immediately; the Razorpay webhook re-confirms authoritatively (idempotent — never double-grants).</>,
                    <>The user is redirected to your <Code>return</Code> URL.</>,
                ]}
            />
        </Box>
    );
}
