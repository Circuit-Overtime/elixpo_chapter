"use client";

import { Box } from "@mui/material";
import CodeBlock from "../../components/code-block";
import { Code, DocH2, DocLead, DocList, DocP, DocTitle } from "@/components/docs-prose";

const HEADERS = `POST <your endpoint>
Content-Type: application/json
X-Elixpo-Pay-Event:     entitlement.updated
X-Elixpo-Pay-Timestamp: 1718500000
X-Elixpo-Pay-Signature: sha256=<hex HMAC of \`\${timestamp}.\${rawBody}\`>`;

const BODY = `{
  "id": "whd_…",
  "type": "entitlement.updated",
  "created": 1718500000,
  "data": {
    "app": "lixblogs",
    "uid": "u_123",
    "tier": "member",
    "status": "active",
    "active": true,
    "expires_at": "2026-07-16 12:00:00",
    "version": 3
  }
}`;

const PAYMENT = `{
  "id": "whd_…",
  "type": "payment.captured",
  "created": 1718500000,
  "data": {
    "app": "lixblogs",
    "uid": "u_123",
    "transaction_id": "txn_…",
    "provider_payment_id": "pay_…",
    "provider_order_id": "order_…",
    "currency": "INR",
    "amount": 19900,
    "tier": "member"
  }
}`;

const VERIFY = `import crypto from "node:crypto";

export async function POST(req) {
  const raw = await req.text();
  const ts = req.headers.get("x-elixpo-pay-timestamp");
  const sig = (req.headers.get("x-elixpo-pay-signature") || "").replace("sha256=", "");

  const expected = crypto
    .createHmac("sha256", process.env.ELIXPO_PAY_WEBHOOK_SECRET)
    .update(ts + "." + raw)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return new Response("bad signature", { status: 401 });
  }

  const evt = JSON.parse(raw);
  if (evt.type === "entitlement.updated") {
    // Upsert users.tier = evt.data.tier with expiry evt.data.expires_at,
    // ignoring deliveries with a lower data.version than you've seen.
  }
  return Response.json({ ok: true });
}`;

export default function WebhooksDocs() {
    return (
        <Box>
            <DocTitle>Webhooks</DocTitle>
            <DocLead>
                Elixpo Pay POSTs signed events to your app's webhook endpoint. Set
                the URL and choose which events to receive under{" "}
                <strong>Entitlement webhook</strong> on your product's page; verify
                each delivery with your per-app signing secret.
            </DocLead>

            <DocH2>Events you can subscribe to</DocH2>
            <DocList
                items={[
                    <><Code>entitlement.updated</Code> — a buyer's access was granted, changed, or expired. <strong>Required</strong> — this is how you fulfill purchases.</>,
                    <><Code>payment.captured</Code> — a payment succeeded. Optional; useful for receipts, analytics, or your own ledger.</>,
                ]}
            />
            <DocP>
                Each endpoint only receives the events it's subscribed to. The
                required event is always on; toggle the optional ones in the
                dashboard. More event types will appear here over time.
            </DocP>

            <DocH2>Request</DocH2>
            <CodeBlock code={HEADERS} language="http" />
            <CodeBlock code={BODY} language="json" />

            <DocH2>payment.captured</DocH2>
            <DocP>
                Same envelope and signature; the <Code>type</Code> and{" "}
                <Code>data</Code> differ. Delivered only if you've enabled it.
            </DocP>
            <CodeBlock code={PAYMENT} language="json" />

            <DocH2>Verifying</DocH2>
            <DocP>
                Recompute the HMAC over <Code>{"`${timestamp}.${rawBody}`"}</Code>
                using your <Code>ELIXPO_PAY_WEBHOOK_SECRET</Code> (the{" "}
                <Code>whsec_…</Code> from the dashboard) and compare in constant time.
                Reject stale timestamps. Branch on <Code>type</Code> since one
                endpoint may receive several event types.
            </DocP>
            <CodeBlock code={VERIFY} language="javascript" />

            <DocH2>Idempotency & ordering</DocH2>
            <DocList
                items={[
                    <>Each entitlement carries a monotonic <Code>version</Code> — ignore any <Code>entitlement.updated</Code> whose version is ≤ the one you've already applied.</>,
                    <>Respond <Code>2xx</Code> quickly; non-2xx responses are recorded as failed deliveries for retry/inspection.</>,
                    <>The same grant may arrive from both the instant client confirmation and the provider webhook — fulfillment is idempotent on our side.</>,
                ]}
            />
        </Box>
    );
}
