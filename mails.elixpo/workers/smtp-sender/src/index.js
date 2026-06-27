// mail.elixpo SMTP sender Worker.
// The one component that opens raw TCP (Pages edge routes can't). The Pages app
// calls POST /send server-to-server with a shared secret; this Worker relays the
// message through the tenant's own SMTP credentials over cloudflare:sockets.
// It is ALSO the Cloudflare Queue consumer for elixpo-mail-send (retries) and
// elixpo-mail-send-retry (failed-email last chance) — see the queue() handler.

import { sendMail } from "./smtp.js";

const REQUIRED = ["host", "user", "pass", "from", "to"];

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === "GET" && url.pathname === "/") {
            return json({ ok: true, service: "mail.elixpo smtp-sender" });
        }
        if (request.method !== "POST" || url.pathname !== "/send") {
            return json({ ok: false, error: "not_found" }, 404);
        }

        // Shared-secret auth (server-to-server only).
        const secret = env.SMTP_SENDER_SECRET;
        if (!secret) return json({ ok: false, error: "sender_misconfigured" }, 500);
        if (!timingSafeEqual(request.headers.get("x-sender-secret") || "", secret)) {
            return json({ ok: false, error: "unauthorized" }, 401);
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return json({ ok: false, error: "invalid_json" }, 400);
        }

        const missing = REQUIRED.filter((k) => !body?.[k]);
        if (missing.length) {
            return json({ ok: false, error: `missing: ${missing.join(", ")}` }, 400);
        }

        try {
            const result = await sendMail({
                host: body.host,
                port: body.port,
                secure: body.secure,
                user: body.user,
                pass: body.pass,
                from: body.from,
                fromName: body.fromName,
                to: body.to,
                subject: body.subject,
                html: body.html,
                text: body.text,
                attachments: Array.isArray(body.attachments) ? body.attachments : [],
                listUnsubscribe: body.listUnsubscribe || null,
                // Pass the Worker env through so the SMTP module can
                // reach DKIM_PRIVATE_KEY / DKIM_DOMAIN / DKIM_SELECTOR
                // and sign the message before transmission. When those
                // aren't set on the env, signing is skipped and the
                // unsigned message goes out — preserves current
                // behaviour for unconfigured deployments.
                env,
            });
            return json(result, 200);
        } catch (err) {
            return json({ ok: false, error: String(err?.message || err) }, 502);
        }
    },

    // Cloudflare Queue consumer. Two queues are bound (see wrangler.toml):
    //   elixpo-mail-send        — (re)send attempts; CF retries with backoff.
    //   elixpo-mail-send-retry  — the failed-email queue: messages the send
    //                             queue gave up on get one last attempt here,
    //                             then the delivery is resolved sent/failed.
    // The Worker stays thin: it can't reach D1 / the encryption key / the render
    // logic, so it calls back into the Pages app's /v1/internal/redeliver, which
    // owns the full pipeline. The shared SMTP_SENDER_SECRET authenticates us.
    async queue(batch, env) {
        const isLastChance = batch.queue && batch.queue.endsWith("-retry");
        for (const msg of batch.messages) {
            const deliveryId = msg.body?.deliveryId;
            if (!deliveryId) {
                msg.ack(); // malformed — nothing we can do, don't loop on it.
                continue;
            }
            try {
                const res = await redeliver(env, deliveryId, isLastChance);
                // The retry queue always resolves the row, so ack. The send
                // queue acks on a terminal outcome (sent / hard-failed) and asks
                // CF to retry while the failure is still transient.
                if (isLastChance || res.retryable !== true) msg.ack();
                else msg.retry();
            } catch (_err) {
                // Couldn't even reach the Pages app — let the queue retry the
                // whole job later so the delivery isn't silently dropped.
                msg.retry();
            }
        }
    },
};

/** Call the Pages app to (re)run the send pipeline for one delivery. */
async function redeliver(env, deliveryId, final) {
    const base = env.PAGES_INTERNAL_URL;
    const secret = env.SMTP_SENDER_SECRET;
    if (!base || !secret)
        throw new Error("redeliver not configured (PAGES_INTERNAL_URL / SMTP_SENDER_SECRET)");
    const res = await fetch(`${base.replace(/\/$/, "")}/v1/internal/redeliver`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-sender-secret": secret },
        body: JSON.stringify({ deliveryId, final: final === true }),
    });
    if (!res.ok) throw new Error(`redeliver endpoint ${res.status}`);
    return res.json();
}

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
