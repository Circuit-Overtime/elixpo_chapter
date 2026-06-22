/**
 * Razorpay (INR) adapter. P0 uses the one-time Orders API:
 * create an order, the client pays via Razorpay Checkout, and we fulfill on the
 * `payment.captured` webhook (the authoritative server-side signal).
 *
 * Docs: https://razorpay.com/docs/api/orders / .../webhooks
 */

import { hmacSha256Hex, timingSafeEqual, verifyHmacSha256Hex } from "../crypto";
import type {
    CreateOrderInput,
    CreateOrderResult,
    CreatePlanInput,
    CreatePlanResult,
    CreateSubscriptionInput,
    CreateSubscriptionResult,
    NormalizedWebhookEvent,
    PaymentProvider,
} from "./types";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export class RazorpayProvider implements PaymentProvider {
    readonly name = "razorpay";

    constructor(
        readonly keyId: string,
        private readonly keySecret: string,
        private readonly webhookSecret: string,
        readonly mode: "test" | "live" = "test",
    ) {}

    private authHeader(): string {
        // Basic auth: base64(key_id:key_secret)
        return `Basic ${btoa(`${this.keyId}:${this.keySecret}`)}`;
    }

    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
        const res = await fetch(`${RAZORPAY_API}/orders`, {
            method: "POST",
            headers: {
                "Authorization": this.authHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount: input.amount,
                currency: input.currency,
                receipt: input.receipt,
                notes: input.notes ?? {},
                payment_capture: 1,
            }),
        });

        const raw: any = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(
                `Razorpay order create failed (${res.status}): ${raw?.error?.description || res.statusText}`,
            );
        }

        return {
            providerOrderId: raw.id,
            amount: raw.amount,
            currency: raw.currency,
            raw,
        };
    }

    /**
     * Client handback signature: HMAC_SHA256(key_secret, `${orderId}|${paymentId}`).
     * Razorpay Checkout returns razorpay_signature in the success callback.
     */
    async verifyPaymentSignature(
        orderId: string,
        paymentId: string,
        signature: string,
    ): Promise<boolean> {
        return verifyHmacSha256Hex(
            this.keySecret,
            `${orderId}|${paymentId}`,
            signature,
        );
    }

    /** Webhook signature: HMAC_SHA256(webhook_secret, rawBody) in X-Razorpay-Signature. */
    async verifyWebhookSignature(
        rawBody: string,
        signature: string,
    ): Promise<boolean> {
        const expected = await hmacSha256Hex(this.webhookSecret, rawBody);
        return timingSafeEqual(expected, (signature || "").trim());
    }

    parseWebhook(rawBody: string, headers: Headers): NormalizedWebhookEvent {
        const body = JSON.parse(rawBody);
        const type: string = body.event || "";
        const payment = body.payload?.payment?.entity;
        const order = body.payload?.order?.entity;

        const isPaymentCaptured =
            type === "payment.captured" ||
            (type === "order.paid" && payment?.status === "captured");

        return {
            eventId: headers.get("x-razorpay-event-id"),
            type,
            isPaymentCaptured,
            providerOrderId: payment?.order_id || order?.id || null,
            providerPaymentId: payment?.id || null,
            amount: payment?.amount ?? order?.amount ?? null,
            currency: payment?.currency ?? order?.currency ?? null,
            raw: body,
        };
    }
}

/**
 * Build a Razorpay provider from env. Selects test vs live keys by RAZORPAY_MODE
 * (default "test"), preferring RAZORPAY_{TEST,LIVE}_* and falling back to the
 * legacy unsuffixed RAZORPAY_* vars. Returns null if no usable keys.
 */
export async function razorpayFromEnv(
    getEnv: (k: string) => Promise<string | undefined>,
): Promise<RazorpayProvider | null> {
    const mode =
        ((await getEnv("RAZORPAY_MODE")) || "test").toLowerCase() === "live"
            ? "live"
            : "test";
    const M = mode.toUpperCase();
    const pick = async (suffix: string) =>
        (await getEnv(`RAZORPAY_${M}_${suffix}`)) ||
        (await getEnv(`RAZORPAY_${suffix}`));

    const keyId = await pick("KEY_ID");
    const keySecret = await pick("KEY_SECRET");
    const webhookSecret = await pick("WEBHOOK_SECRET");
    if (!keyId || !keySecret) return null;
    return new RazorpayProvider(keyId, keySecret, webhookSecret || "", mode);
}
