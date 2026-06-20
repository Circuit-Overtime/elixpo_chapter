/**
 * Send pipeline — the keystone that turns a (template, variables, recipient)
 * into a real email and a delivery-log row. Used by the public trigger
 * endpoint (app/v1/hooks/[key]). Sender resolution follows the agreed chain:
 *
 *     template.sender_id  →  product.default_sender_id  →  tenant default sender
 *
 * Every attempt — success or failure — is recorded in `deliveries`.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { listAttachments, resolveAttachments } from "./attachments";
import { createDelivery, markDeliveryFailed, markDeliverySent } from "./deliveries";
import { decryptSecret } from "./encryption";
import { appUrl } from "./env";
import { type ProductRow, productToFooter } from "./products";
import { renderTemplate } from "./render";
import { isSuppressed, signUnsub } from "./suppressions";
import { type SenderRow, getSender } from "./senders";
import { relayViaSender } from "./smtp-sender";
import type { TemplateRow } from "./templates";

/**
 * Resolve which sender a template sends through:
 *   1. the template's explicit sender override, else
 *   2. the product's default sender, else
 *   3. the tenant's default sender (is_default = 1).
 */
export async function resolveSender(
    db: D1Database,
    tenantId: string,
    template: TemplateRow,
    product: ProductRow | null,
): Promise<SenderRow | null> {
    if (template.sender_id) {
        const s = await getSender(db, tenantId, template.sender_id);
        if (s) return s;
    }
    if (product?.default_sender_id) {
        const s = await getSender(db, tenantId, product.default_sender_id);
        if (s) return s;
    }
    return (await db
        .prepare("SELECT * FROM senders WHERE tenant_id = ? AND is_default = 1 LIMIT 1")
        .bind(tenantId)
        .first()) as SenderRow | null;
}

export interface DeliverInput {
    tenantId: string;
    template: TemplateRow;
    product: ProductRow | null;
    webhookId?: string | null;
    to: string;
    vars?: Record<string, any>;
    /** Optional From override (e.g. an alias). Defaults to the sender identity. */
    fromEmail?: string | null;
    fromName?: string | null;
    idempotencyKey?: string | null;
}

export interface DeliverResult {
    ok: boolean;
    deliveryId: string;
    status: "sent" | "failed" | "suppressed";
    subject: string;
    error?: string;
    smtpResponse?: string | null;
}

/**
 * Render the template, relay it through the resolved sender, and log the
 * outcome. Always returns a DeliverResult (never throws for send failures —
 * those are captured in the delivery row and the result).
 */
export async function deliverTemplate(
    db: D1Database,
    input: DeliverInput,
): Promise<DeliverResult> {
    const { tenantId, template, product, webhookId, to, vars = {} } = input;
    const productId = product?.id ?? template.product_id;
    const isTransactional = template.transactional === 1;

    // Honor unsubscribes — except for transactional templates (receipts etc.),
    // which are CAN-SPAM exempt and always send.
    if (!isTransactional && (await isSuppressed(db, productId, to))) {
        const deliveryId = await createDelivery(db, {
            tenantId,
            productId,
            templateId: template.id,
            webhookId: webhookId || null,
            senderId: null,
            toEmail: to,
            subject: template.subject,
            vars,
            idempotencyKey: input.idempotencyKey || null,
            status: "suppressed",
        });
        return { ok: false, deliveryId, status: "suppressed", subject: template.subject, error: "Recipient is unsubscribed." };
    }

    // Per-recipient one-click unsubscribe link (non-transactional only).
    const unsubscribeUrl = isTransactional ? null : `${await appUrl()}/u/${await signUnsub(productId, to)}`;

    const sender = await resolveSender(db, tenantId, template, product);
    const footer = product ? productToFooter(product) : null;
    if (footer && unsubscribeUrl) footer.unsubscribeUrl = unsubscribeUrl;
    const rendered = renderTemplate(
        {
            subject: template.subject,
            content_html: template.content_html,
            background_color: template.bg_color,
        },
        { ...vars, unsubscribe_url: unsubscribeUrl || "" },
        footer,
    );
    const subject = rendered.subject || "(no subject)";

    // Open the delivery row up front so even a pre-send failure is auditable.
    const deliveryId = await createDelivery(db, {
        tenantId,
        productId,
        templateId: template.id,
        webhookId: webhookId || null,
        senderId: sender?.id ?? null,
        toEmail: to,
        subject,
        vars,
        idempotencyKey: input.idempotencyKey || null,
    });

    if (!sender) {
        const error = "No sender available — set a default sender on the product or tenant.";
        await markDeliveryFailed(db, deliveryId, error);
        return { ok: false, deliveryId, status: "failed", subject, error };
    }
    if (sender.status && sender.status !== "active") {
        const error = `Sender ${sender.email} is ${sender.status}.`;
        await markDeliveryFailed(db, deliveryId, error);
        return { ok: false, deliveryId, status: "failed", subject, error };
    }

    let pass: string;
    try {
        pass = await decryptSecret(sender.app_password_enc);
    } catch {
        const error = "Could not decrypt the sender's app password.";
        await markDeliveryFailed(db, deliveryId, error);
        return { ok: false, deliveryId, status: "failed", subject, error };
    }

    // Resolve attachments (substitute vars, download from Drive/URL, base64).
    let attachments: Array<{ filename: string; contentType: string; contentBase64: string }> = [];
    try {
        const rows = await listAttachments(db, tenantId, template.id);
        if (rows.length) attachments = await resolveAttachments(db, tenantId, rows, vars);
    } catch {
        attachments = [];
    }

    const result = await relayViaSender({
        host: sender.smtp_host,
        port: sender.smtp_port,
        secure: sender.smtp_secure,
        user: sender.username || sender.email,
        pass,
        from: input.fromEmail || sender.email,
        fromName: input.fromName ?? sender.display_name,
        to,
        subject,
        html: rendered.html,
        text: rendered.text,
        attachments,
        listUnsubscribe: unsubscribeUrl,
    });

    if (result.ok) {
        await markDeliverySent(db, deliveryId, result.response ?? null);
        return {
            ok: true,
            deliveryId,
            status: "sent",
            subject,
            smtpResponse: result.response ?? null,
        };
    }

    const error = result.error || "Send failed.";
    await markDeliveryFailed(db, deliveryId, error, result.response ?? null);
    return { ok: false, deliveryId, status: "failed", subject, error, smtpResponse: result.response ?? null };
}
