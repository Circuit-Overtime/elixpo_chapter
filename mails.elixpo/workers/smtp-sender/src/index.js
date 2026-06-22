// mail.elixpo SMTP sender Worker.
// The one component that opens raw TCP (Pages edge routes can't). The Pages app
// calls POST /send server-to-server with a shared secret; this Worker relays the
// message through the tenant's own SMTP credentials over cloudflare:sockets.
// Later (step 5) this same Worker also becomes the Cloudflare Queue consumer.

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
            return json(
                { ok: false, error: String((err && err.message) || err) },
                502,
            );
        }
    },
};

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
