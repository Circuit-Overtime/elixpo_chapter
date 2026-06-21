/**
 * Provider adapter interface. P0 implements Razorpay; Stripe/PayPal/etc. slot
 * in behind the same shape later (the plan's adapter pattern).
 */

export interface CreateOrderInput {
    /** Minor units (paise/cents). */
    amount: number;
    currency: string;
    /** Our checkout session id, passed through for reconciliation. */
    receipt: string;
    notes?: Record<string, string>;
}

export interface CreateOrderResult {
    providerOrderId: string;
    amount: number;
    currency: string;
    raw: unknown;
}

export interface NormalizedWebhookEvent {
    /** Provider's unique event id (for replay de-dup). */
    eventId: string | null;
    type: string;
    /** True when this event means "money captured, fulfill now". */
    isPaymentCaptured: boolean;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    amount: number | null;
    currency: string | null;
    raw: unknown;
}

export interface PaymentProvider {
    readonly name: string;
    createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
    /** Verify the client-side handback signature (order|payment). */
    verifyPaymentSignature(
        orderId: string,
        paymentId: string,
        signature: string,
    ): Promise<boolean>;
    /** Verify an inbound webhook's raw body against its signature header. */
    verifyWebhookSignature(
        rawBody: string,
        signature: string,
    ): Promise<boolean>;
    /** Parse a verified webhook body into a normalized event. */
    parseWebhook(rawBody: string, headers: Headers): NormalizedWebhookEvent;
}
