"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import StorefrontIcon from "@mui/icons-material/Storefront";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Snackbar,
    Stack,
    Typography,
} from "@mui/material";
import { useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import BackgroundAurora from "../components/background-aurora";

declare global {
    interface Window {
        Razorpay?: any;
    }
}

interface SessionData {
    session_id: string;
    // One-time-order fields (billing_mode === 'one_time')
    key_id?: string;
    order_id?: string;
    // Autopay fields (billing_mode === 'autopay'): Razorpay's hosted
    // mandate-collection URL — we redirect there instead of opening
    // Checkout JS, because subscriptions can't be driven by the modal
    // (RBI eMandate flow needs the full-page UX).
    billing_mode?: "one_time" | "autopay";
    subscription_id?: string;
    short_url?: string | null;
    /**
     * Set when a reload lands on a session whose autopay subscription
     * has already moved past the mandate stage (active/cancelled/etc.)
     * — there's nothing left for the buyer to do on Razorpay, so we
     * just send them back to the merchant's return_url.
     */
    finished?: boolean;
    test_mode?: boolean;
    mode?: "test" | "live";
    amount: number;
    currency: string;
    product_name: string;
    tier: string;
    app?: string;
    app_name?: string;
    interval?: string;
    interval_count?: number;
    prefill: { email?: string };
    return_url: string | null;
}

type Toast = { msg: string; severity: "error" | "info" | "success" } | null;
type Phase = "loading" | "ready" | "paying" | "success" | "error";

const SYMBOLS: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
};

function formatAmount(minor: number, currency: string): string {
    const symbol = SYMBOLS[currency] ?? `${currency} `;
    return `${symbol}${(minor / 100).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

function periodLabel(interval = "month", count = 1): string {
    if (count > 1) return `every ${count} ${interval}s`;
    return (
        { day: "daily", week: "weekly", month: "monthly", year: "yearly" }[
            interval
        ] ?? `per ${interval}`
    );
}

function periodShort(interval = "month", count = 1): string {
    return `/ ${count > 1 ? `${count} ` : ""}${interval}`;
}

function hostOf(url?: string | null): string | null {
    if (!url) return null;
    try {
        return new URL(url).host;
    } catch {
        return null;
    }
}

function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
    });
}

function CheckoutInner() {
    const params = useSearchParams();
    // Primary: server-created session id (?session=). Legacy: signed handoff
    // token (?token=) for callers that haven't migrated to /v1/checkout/sessions.
    const sessionParam = params.get("session");
    const token = params.get("token");
    const handle = sessionParam || token;

    const [phase, setPhase] = useState<Phase>("loading");
    const [error, setError] = useState("");
    const [session, setSession] = useState<SessionData | null>(null);
    const [toast, setToast] = useState<Toast>(null);
    // Timestamp the buyer reached this checkout (client-side, their local time).
    const [startedAt] = useState<Date>(() => new Date());

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!handle) {
                setError(
                    "This checkout link is missing or has already been used.",
                );
                setPhase("error");
                return;
            }
            const reqBody = sessionParam
                ? { session_id: sessionParam }
                : { token };
            try {
                const [res] = await Promise.all([
                    fetch("/api/checkout/session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(reqBody),
                    }),
                    loadRazorpayScript(),
                ]);
                const data: any = await res.json();
                if (!res.ok)
                    throw new Error(data.error_description || data.error);
                if (cancelled) return;
                setSession(data);
                // If the autopay subscription has already moved past the
                // mandate stage on Razorpay's side (e.g. the buyer hit
                // back-button after activating), skip the action panel
                // and send them to the return_url. Showing them a "pay"
                // button at this point would just dead-end on "Hosted
                // page is not available".
                if (data.finished) {
                    finishSuccess(data.return_url);
                    return;
                }
                setPhase("ready");
            } catch (e: any) {
                if (cancelled) return;
                setError(
                    e?.message ||
                        "We couldn't start your checkout. Please go back and try again.",
                );
                setPhase("error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [handle, sessionParam, token]);

    const goBack = () => {
        const back = session?.return_url;
        if (back) window.location.href = back;
        else if (window.history.length > 1) window.history.back();
        else window.location.href = "/";
    };

    const finishSuccess = (returnUrl?: string | null) => {
        setPhase("success");
        // No toast here — the full-card success state already says it clearly.
        const back = returnUrl || session?.return_url;
        if (back) setTimeout(() => (window.location.href = back), 2600);
    };

    const payTest = async () => {
        if (!session) return;
        setPhase("paying");
        try {
            const v = await fetch("/api/checkout/test-complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: session.session_id }),
            });
            const vd: any = await v.json();
            if (!v.ok) throw new Error(vd.error || "test_failed");
            finishSuccess(vd.return_url);
        } catch (e: any) {
            setToast({
                msg: e?.message || "Test payment failed. Try again.",
                severity: "error",
            });
            setPhase("ready");
        }
    };

    const pay = async () => {
        if (!session) return;
        if (session.test_mode) return payTest();

        // Autopay (subscription) path — hosted mandate collection on
        // Razorpay's side. There is no JS modal flow for eMandates; we
        // hand the browser off to short_url and Razorpay handles card
        // collection, OTP, mandate registration, and the first charge.
        // After completion they redirect back to our return_url; the
        // entitlement flips on subscription.activated → entitlement.updated.
        if (session.billing_mode === "autopay") {
            if (!session.short_url) {
                setToast({
                    msg: "Autopay setup is missing the redirect URL. Refresh and try again.",
                    severity: "error",
                });
                return;
            }
            setPhase("paying");
            window.location.href = session.short_url;
            return;
        }

        if (!window.Razorpay) {
            setToast({
                msg: "Payment library failed to load. Check your connection and retry.",
                severity: "error",
            });
            return;
        }
        if (!session.key_id || !session.order_id) {
            setToast({
                msg: "Checkout session is missing payment details. Refresh and try again.",
                severity: "error",
            });
            return;
        }
        setPhase("paying");
        // Branding shown to the buyer at payment time: who they're paying
        // (the merchant app), what for (product + billing period), and a logo —
        // so the charge is recognizable in the Razorpay sheet and UPI apps.
        const payName = session.app_name || "Elixpo Pay";
        const payDesc = `${session.product_name} · ${periodLabel(session.interval, session.interval_count)}`;
        const rzp = new window.Razorpay({
            key: session.key_id,
            order_id: session.order_id,
            amount: session.amount,
            currency: session.currency,
            name: payName,
            description: payDesc,
            image: `${window.location.origin}/mark.png`,
            prefill: { email: session.prefill?.email || "" },
            notes: { product: session.product_name, plan: session.tier },
            theme: { color: "#9b7bf7" },
            handler: async (resp: any) => {
                try {
                    const v = await fetch("/api/checkout/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            session_id: session.session_id,
                            razorpay_order_id: resp.razorpay_order_id,
                            razorpay_payment_id: resp.razorpay_payment_id,
                            razorpay_signature: resp.razorpay_signature,
                        }),
                    });
                    const vd: any = await v.json();
                    if (!v.ok)
                        throw new Error(vd.error || "verification_failed");
                    finishSuccess(vd.return_url);
                } catch {
                    setToast({
                        msg: "Payment received but verification failed. If you were charged, contact support.",
                        severity: "error",
                    });
                    setPhase("ready");
                }
            },
            modal: {
                ondismiss: () => {
                    setPhase("ready");
                    setToast({
                        msg: "Payment cancelled — you can try again.",
                        severity: "info",
                    });
                },
            },
        });
        rzp.on("payment.failed", (resp: any) => {
            setToast({
                msg:
                    resp?.error?.description ||
                    "Payment failed. Please try another method.",
                severity: "error",
            });
            setPhase("ready");
        });
        rzp.open();
    };

    const split = (phase === "ready" || phase === "paying") && !!session;

    return (
        <Shell split={split}>
            {phase === "loading" && (
                <Centered>
                    <CircularProgress sx={{ color: "#9b7bf7" }} />
                    <Typography sx={{ color: "rgba(245,245,244,0.7)", mt: 2 }}>
                        Preparing your secure checkout…
                    </Typography>
                </Centered>
            )}

            {phase === "error" && (
                <Centered>
                    <Typography sx={{ fontSize: "2rem" }}>⚠️</Typography>
                    <Typography
                        sx={{ fontWeight: 700, fontSize: "1.15rem", mt: 1 }}
                    >
                        Checkout unavailable
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.6)",
                            textAlign: "center",
                            fontSize: "0.9rem",
                            lineHeight: 1.6,
                            mt: 1,
                            maxWidth: 360,
                        }}
                    >
                        {error}
                    </Typography>
                    <Button
                        onClick={goBack}
                        startIcon={<ArrowBackIcon />}
                        sx={{ ...ghostBtn, mt: 2.5 }}
                    >
                        Go back
                    </Button>
                </Centered>
            )}

            {phase === "success" && (
                <Centered>
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            background: "rgba(74,222,128,0.12)",
                            border: "1px solid rgba(74,222,128,0.3)",
                            mb: 0.5,
                        }}
                    >
                        <CheckCircleIcon
                            sx={{ fontSize: 40, color: "#4ade80" }}
                        />
                    </Box>
                    <Typography
                        sx={{ fontWeight: 800, fontSize: "1.35rem", mt: 1 }}
                    >
                        You're all set
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.7)",
                            textAlign: "center",
                            fontSize: "0.95rem",
                            mt: 1,
                            maxWidth: 360,
                            lineHeight: 1.6,
                        }}
                    >
                        Your{" "}
                        <strong>
                            {session?.product_name || session?.tier}
                        </strong>
                        {session?.app_name ? (
                            <>
                                {" "}
                                on <strong>{session.app_name}</strong>
                            </>
                        ) : null}{" "}
                        is now active.
                    </Typography>
                    {hostOf(session?.return_url) && (
                        <Typography
                            sx={{
                                color: "rgba(245,245,244,0.45)",
                                fontSize: "0.82rem",
                                mt: 1,
                            }}
                        >
                            Taking you back to {hostOf(session?.return_url)}…
                        </Typography>
                    )}
                    {session?.return_url && (
                        <Button
                            onClick={goBack}
                            sx={{ ...primaryBtn, mt: 2.5, px: 4 }}
                        >
                            Continue
                        </Button>
                    )}
                </Centered>
            )}

            {split && session && (
                <>
                    <SummaryPanel session={session} startedAt={startedAt} />
                    <ActionPanel
                        session={session}
                        phase={phase}
                        onPay={pay}
                        onCancel={goBack}
                    />
                </>
            )}

            <Snackbar
                open={!!toast}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                {toast ? (
                    <Alert
                        onClose={() => setToast(null)}
                        severity={toast.severity}
                        variant="filled"
                        sx={{ borderRadius: "12px", alignItems: "center" }}
                    >
                        {toast.msg}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </Shell>
    );
}

/* ── Left: branded order summary + official details ────────────────────────── */
function SummaryPanel({
    session,
    startedAt,
}: {
    session: SessionData;
    startedAt: Date;
}) {
    const ref = session.order_id || session.session_id;
    const returnHost = hostOf(session.return_url);
    return (
        <Box
            sx={{
                flex: { xs: "1 1 auto", md: "0 0 46%" },
                p: { xs: 3, md: 3.5 },
                background:
                    "linear-gradient(160deg, rgba(155,123,247,0.22) 0%, rgba(124,92,255,0.10) 45%, rgba(255,255,255,0.02) 100%)",
                borderRight: { md: "1px solid rgba(255,255,255,0.08)" },
                borderBottom: {
                    xs: "1px solid rgba(255,255,255,0.08)",
                    md: "none",
                },
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2.5 }}
            >
                <Stack direction="row" spacing={1.2} alignItems="center">
                    <Box
                        component="img"
                        src="/mark.png"
                        alt="Elixpo Pay"
                        sx={{
                            height: 28,
                            width: 28,
                            borderRadius: "8px",
                            display: "block",
                        }}
                    />
                    <Typography sx={{ fontWeight: 700 }}>
                        Elixpo{" "}
                        <Box component="span" sx={{ color: "#c4b5fd" }}>
                            Pay
                        </Box>
                    </Typography>
                </Stack>
                {(session.test_mode || session.mode === "test") && (
                    <Chip
                        label="TEST"
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            color: "#fbbf24",
                            bgcolor: "rgba(251,191,36,0.12)",
                            border: "1px solid rgba(251,191,36,0.3)",
                        }}
                    />
                )}
            </Stack>

            {session.app_name && (
                <Stack
                    direction="row"
                    spacing={0.7}
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                >
                    <StorefrontIcon
                        sx={{ fontSize: 14, color: "rgba(245,245,244,0.5)" }}
                    />
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.6)",
                            fontSize: "0.8rem",
                        }}
                    >
                        Payment for{" "}
                        <strong style={{ color: "#f5f5f4" }}>
                            {session.app_name}
                        </strong>
                    </Typography>
                </Stack>
            )}

            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                sx={{ mb: 0.5 }}
            >
                <Typography sx={{ fontWeight: 700, fontSize: "1.3rem" }}>
                    {session.product_name}
                </Typography>
                <Chip
                    label={session.tier}
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        color: "#86efac",
                        bgcolor: "rgba(134,239,172,0.12)",
                        border: "1px solid rgba(134,239,172,0.3)",
                    }}
                />
            </Stack>

            <Box
                sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 0.7,
                    mt: 1.5,
                    mb: 2.5,
                }}
            >
                <Typography
                    sx={{ fontWeight: 800, fontSize: "2.4rem", lineHeight: 1 }}
                >
                    {formatAmount(session.amount, session.currency)}
                </Typography>
                <Typography
                    sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.9rem" }}
                >
                    {periodShort(session.interval, session.interval_count)}
                </Typography>
            </Box>

            <Box
                sx={{
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    pt: 2,
                    mt: "auto",
                }}
            >
                <Meta
                    label="Billing"
                    value={periodLabel(
                        session.interval,
                        session.interval_count,
                    )}
                />
                {session.prefill?.email && (
                    <Meta label="Account" value={session.prefill.email} />
                )}
                <Meta
                    label="Date"
                    value={startedAt.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                    })}
                />
                <Meta label="Order ref" value={ref} mono />
                {returnHost && <Meta label="Returns to" value={returnHost} />}
            </Box>

            <Stack
                direction="row"
                spacing={0.7}
                alignItems="center"
                sx={{ mt: 2.5 }}
            >
                <LockIcon
                    sx={{ fontSize: 13, color: "rgba(245,245,244,0.4)" }}
                />
                <Typography
                    sx={{ color: "rgba(245,245,244,0.4)", fontSize: "0.74rem" }}
                >
                    Secured by Razorpay
                </Typography>
            </Stack>
        </Box>
    );
}

/* ── Right: the pay action ─────────────────────────────────────────────────── */
function ActionPanel({
    session,
    phase,
    onPay,
    onCancel,
}: {
    session: SessionData;
    phase: Phase;
    onPay: () => void;
    onCancel: () => void;
}) {
    const paying = phase === "paying";
    return (
        <Box
            sx={{
                flex: "1 1 auto",
                p: { xs: 3, md: 4 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
            }}
        >
            <Typography sx={{ fontWeight: 700, fontSize: "1.15rem", mb: 0.5 }}>
                Complete your payment
            </Typography>
            <Typography
                sx={{
                    color: "rgba(245,245,244,0.55)",
                    fontSize: "0.9rem",
                    mb: 3,
                }}
            >
                You'll be charged{" "}
                <strong style={{ color: "#f5f5f4" }}>
                    {formatAmount(session.amount, session.currency)}
                </strong>{" "}
                {periodLabel(session.interval, session.interval_count)}, you can
                cancel anytime.
                {session.test_mode || session.mode === "test"
                    ? " (Test mode — no real charge.)"
                    : ""}
            </Typography>

            <Button onClick={onPay} disabled={paying} sx={primaryBtn}>
                {paying
                    ? session.test_mode
                        ? "Completing…"
                        : session.billing_mode === "autopay"
                          ? "Redirecting to Razorpay…"
                          : "Opening Razorpay…"
                    : session.billing_mode === "autopay"
                      ? `Set up auto-pay · ${formatAmount(session.amount, session.currency)}/${session.interval ?? "month"}`
                      : `${session.test_mode ? "Simulate payment · " : "Pay "}${formatAmount(session.amount, session.currency)}`}
            </Button>

            <Button
                onClick={onCancel}
                disabled={paying}
                startIcon={
                    <ArrowBackIcon sx={{ fontSize: "1rem !important" }} />
                }
                sx={{ ...cancelBtn, mt: 1.2 }}
            >
                Cancel and go back
            </Button>

            <Typography
                sx={{
                    color: "rgba(245,245,244,0.4)",
                    fontSize: "0.76rem",
                    textAlign: "center",
                    mt: 2.5,
                }}
            >
                By paying you agree to our{" "}
                <Box
                    component="a"
                    href="/terms"
                    target="_blank"
                    sx={{ color: "#9b7bf7", textDecoration: "none" }}
                >
                    Terms
                </Box>{" "}
                &{" "}
                <Box
                    component="a"
                    href="/refunds"
                    target="_blank"
                    sx={{ color: "#9b7bf7", textDecoration: "none" }}
                >
                    Refund policy
                </Box>
                .
            </Typography>
        </Box>
    );
}

function Meta({
    label,
    value,
    mono,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 0.45, gap: 2 }}
        >
            <Typography
                sx={{
                    color: "rgba(245,245,244,0.45)",
                    fontSize: "0.78rem",
                    flexShrink: 0,
                }}
            >
                {label}
            </Typography>
            <Typography
                sx={{
                    color: "rgba(245,245,244,0.8)",
                    fontSize: "0.78rem",
                    textAlign: "right",
                    fontFamily: mono ? "var(--font-geist-mono)" : undefined,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 200,
                }}
            >
                {value}
            </Typography>
        </Stack>
    );
}

function Centered({ children }: { children: ReactNode }) {
    return (
        <Box
            sx={{
                flex: "1 1 auto",
                p: { xs: 4, md: 6 },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 280,
            }}
        >
            {children}
        </Box>
    );
}

function Shell({ children, split }: { children: ReactNode; split: boolean }) {
    return (
        <Box
            sx={{
                position: "relative",
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                p: 2,
                color: "#f5f5f4",
            }}
        >
            <BackgroundAurora variant="auth" />
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    maxWidth: split ? { xs: 440, md: 760 } : 460,
                    borderRadius: "20px",
                    overflow: "hidden",
                    background:
                        "linear-gradient(135deg, rgba(20,23,30,0.92) 0%, rgba(14,17,23,0.94) 100%)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
                    display: "flex",
                    flexDirection: {
                        xs: "column",
                        md: split ? "row" : "column",
                    },
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

const primaryBtn = {
    textTransform: "none",
    fontWeight: 700,
    fontSize: "1rem",
    color: "#fff",
    py: 1.4,
    borderRadius: "12px",
    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
    boxShadow: "0 6px 20px rgba(155,123,247,0.4)",
    "&:hover": {
        background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
    },
    "&.Mui-disabled": { opacity: 0.6, color: "#fff" },
};

const cancelBtn = {
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "rgba(245,245,244,0.6)",
    py: 0.8,
    borderRadius: "12px",
    "&:hover": { color: "#fff", background: "rgba(255,255,255,0.04)" },
    "&.Mui-disabled": { opacity: 0.4 },
};

const ghostBtn = {
    textTransform: "none",
    fontWeight: 600,
    color: "#f5f5f4",
    px: 2.6,
    py: 1,
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.16)",
    "&:hover": {
        borderColor: "rgba(155,123,247,0.5)",
        background: "rgba(155,123,247,0.06)",
    },
};

export default function CheckoutPage() {
    return (
        <Suspense
            fallback={
                <Box
                    sx={{
                        minHeight: "100vh",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "#0b0d12",
                    }}
                >
                    <CircularProgress sx={{ color: "#9b7bf7" }} />
                </Box>
            }
        >
            <CheckoutInner />
        </Suspense>
    );
}
