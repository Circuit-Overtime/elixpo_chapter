"use client";

import { Box } from "@mui/material";
import CodeBlock from "../../components/code-block";
import {
    Code,
    DocH2,
    DocLead,
    DocList,
    DocP,
    DocTitle,
} from "@/components/docs-prose";

const FLOW = `// In your app (server-side), when a user upgrades:
import crypto from "node:crypto";

const payload = {
  app: "lixblogs",        // your app slug
  plan: "member",         // the product tier
  uid: user.id,           // your user id
  currency: "INR",
  amount: 19900,          // minor units (paise) — authoritative
  return: "https://blogs.elixpo.com/pricing",
  email: user.email,      // optional
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 1800, // 30 min
};

const body = base64url(JSON.stringify(payload));
const sig = crypto
  .createHmac("sha256", process.env.ELIXPO_PAY_HANDOFF_SECRET)
  .update(body)
  .digest("hex");
const token = body + "." + sig;

// Redirect the user to hosted checkout:
redirect("https://payouts.elixpo.com/checkout?token=" + token);

function base64url(s) {
  return Buffer.from(s).toString("base64url");
}`;

const READ = `// After payment, read the entitlement any time:
const res = await fetch(
  "https://payouts.elixpo.com/v1/entitlements?app=lixblogs&uid=" + user.id,
  { headers: { Authorization: "Bearer " + process.env.ELIXPO_PAY_API_KEY } }
);
const ent = await res.json();
// { app, uid, tier, status, active, expires_at, version }`;

export default function Quickstart() {
    return (
        <Box>
            <DocTitle>Quickstart</DocTitle>
            <DocLead>
                Three steps: hand off to checkout, receive the grant webhook, and
                read entitlements. You'll need two shared secrets and an API key —
                create your app in the dashboard's Developers tab to get them.
            </DocLead>

            <DocH2>1. Get your credentials</DocH2>
            <DocList
                items={[
                    <><Code>ELIXPO_PAY_HANDOFF_SECRET</Code> — HMAC secret signing the checkout handoff token.</>,
                    <><Code>ELIXPO_PAY_WEBHOOK_SECRET</Code> — HMAC secret you verify inbound webhooks with.</>,
                    <><Code>ELIXPO_PAY_API_KEY</Code> — your app's secret key for the entitlements API (shown once on app creation).</>,
                ]}
            />

            <DocH2>2. Hand off to checkout</DocH2>
            <DocP>
                Build a short-lived signed token and redirect the user. The token
                is the only trusted source for the amount — never the loose query
                params.
            </DocP>
            <CodeBlock code={FLOW} language="javascript" />

            <DocH2>3. Read entitlements</DocH2>
            <DocP>
                After a successful payment we push a webhook (see Webhooks). You can
                also pull the current state at any time:
            </DocP>
            <CodeBlock code={READ} language="javascript" />
        </Box>
    );
}
