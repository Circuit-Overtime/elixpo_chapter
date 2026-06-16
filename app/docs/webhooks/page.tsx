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

  const { data } = JSON.parse(raw);
  // Upsert users.tier = data.tier with expiry data.expires_at,
  // ignoring deliveries with a lower data.version than you've seen.
  return Response.json({ ok: true });
}`;

export default function WebhooksDocs() {
    return (
        <Box>
            <DocTitle>Webhooks</DocTitle>
            <DocLead>
                When an entitlement changes, Elixpo Pay POSTs a signed
                <Code>entitlement.updated</Code> event to your app's webhook
                endpoint. Verify the signature and apply the tier.
            </DocLead>

            <DocH2>Request</DocH2>
            <CodeBlock code={HEADERS} language="http" />
            <CodeBlock code={BODY} language="json" />

            <DocH2>Verifying</DocH2>
            <DocP>
                Recompute the HMAC over <Code>{"`${timestamp}.${rawBody}`"}</Code>
                using <Code>ELIXPO_PAY_WEBHOOK_SECRET</Code> and compare in constant
                time. Reject stale timestamps.
            </DocP>
            <CodeBlock code={VERIFY} language="javascript" />

            <DocH2>Idempotency & ordering</DocH2>
            <DocList
                items={[
                    <>Each entitlement carries a monotonic <Code>version</Code> — ignore any delivery whose version is ≤ the one you've already applied.</>,
                    <>Respond <Code>2xx</Code> quickly; non-2xx responses are recorded as failed deliveries for retry/inspection.</>,
                    <>The same grant may arrive from both the instant client confirmation and the provider webhook — fulfillment is idempotent on our side.</>,
                ]}
            />
        </Box>
    );
}
