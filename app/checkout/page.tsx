"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
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
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BackgroundAurora from "../components/background-aurora";

declare global {
    interface Window {
        Razorpay?: any;
    }
}

interface SessionData {
    session_id: string;
    key_id: string;
    order_id: string;
    test_mode?: boolean;
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

const SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

function formatAmount(minor: number, currency: string): string {
    const symbol = SYMBOLS[currency] ?? `${currency} `;
    return `${symbol}${(minor / 100).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

function periodLabel(interval = "month", count = 1): string {
    if (count > 1) return `every ${count} ${interval}s`;
    return { day: "daily", week: "weekly", month: "monthly", year: "yearly" }[interval] ?? `per ${interval}`;
}

function periodShort(interval = "month", count = 1): string {
    return `/ ${count > 1 ? `${count} ` : ""}${interval}`;
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
    const token = params.get("token");

    const [phase, setPhase] = useState<Phase>("loading");
    const [error, setError] = useState("");
    const [session, setSession] = useState<SessionData | null>(null);
    const [toast, setToast] = useState<Toast>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!token) {
                setError("This checkout link is missing or has already been used.");
                setPhase("error");
                return;
            }
            try {
                const [res] = await Promise.all([
                    fetch("/api/checkout/session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token }),
                    }),
                    loadRazorpayScript(),
                ]);
                const data: any = await res.json();
                if (!res.ok) throw new Error(data.error_description || data.error);
                if (cancelled) return;
                setSession(data);
                setPhase("ready");
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.message || "We couldn't start your checkout. Please go back and try again.");
                setPhase("error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const goBack = () => {
        const back = session?.return_url;
        if (back) window.location.href = back;
        else if (window.history.length > 1) window.history.back();
        else window.location.href = "/";
    };

    const finishSuccess = (returnUrl?: string | null) => {
        setPhase("success");
        setToast({ msg: "Payment successful — access activated.", severity: "success" });
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
            setToast({ msg: e?.message || "Test payment failed. Try again.", severity: "error" });
            setPhase("ready");
        }
    };

    const pay = async () => {
        if (!session) return;
        if (session.test_mode) return payTest();
        if (!window.Razorpay) {
            setToast({ msg: "Payment library failed to load. Check your connection and retry.", severity: "error" });
            return;
        }
        setPhase("paying");
        const rzp = new window.Razorpay({
            key: session.key_id,
            order_id: session.order_id,
            amount: session.amount,
            currency: session.currency,
            name: "Elixpo Pay",
            description: session.product_name,
            prefill: { email: session.prefill?.email || "" },
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
                    if (!v.ok) throw new Error(vd.error || "verification_failed");
                    finishSuccess(vd.return_url);
                } catch (e: any) {
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
                    setToast({ msg: "Payment cancelled — you can try again.", severity: "info" });
                },
            },
        });
        rzp.on("payment.failed", (resp: any) => {
            setToast({ msg: resp?.error?.description || "Payment failed. Please try another method.", severity: "error" });
            setPhase("ready");
        });
        rzp.open();
    };

    return (
        <Card testMode={session?.test_mode}>
            {phase === "loading" && (
                <Stack spacing={2} alignItems="center" sx={{ py: 5 }}>
                    <CircularProgress sx={{ color: "#9b7bf7" }} />
                    <Typography sx={{ color: "rgba(245,245,244,0.7)" }}>
                        Preparing your secure checkout…
                    </Typography>
                </Stack>
            )}

            {phase === "error" && (
                <Stack spacing={2.5} alignItems="center" sx={{ py: 3 }}>
                    <Typography sx={{ fontSize: "2rem" }}>⚠️</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
                        Checkout unavailable
                    </Typography>
                    <Typography sx={{ color: "rgba(245,245,244,0.6)", textAlign: "center", fontSize: "0.9rem", lineHeight: 1.6 }}>
                        {error}
                    </Typography>
                    <Button onClick={goBack} startIcon={<ArrowBackIcon />} sx={ghostBtn}>
                        Go back
                    </Button>
                </Stack>
            )}

            {phase === "success" && (
                <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
                    <CheckCircleIcon sx={{ fontSize: 58, color: "#4ade80" }} />
                    <Typography sx={{ fontWeight: 700, fontSize: "1.25rem" }}>
                        Payment successful
                    </Typography>
                    <Typography sx={{ color: "rgba(245,245,244,0.6)", textAlign: "center", fontSize: "0.9rem" }}>
                        Your {session?.tier} access is active. Redirecting you back…
                    </Typography>
                    {session?.return_url && (
                        <Button onClick={goBack} sx={{ ...primaryBtn, mt: 1 }}>
                            Continue
                        </Button>
                    )}
                </Stack>
            )}

            {(phase === "ready" || phase === "paying") && session && (
                <Stack spacing={2.5}>
                    {/* merchant + product */}
                    <Box>
                        <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {session.app_name || "Subscription"}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                            <Typography sx={{ fontWeight: 700, fontSize: "1.35rem" }}>
                                {session.product_name}
                            </Typography>
                            <Chip
                                label={session.tier}
                                size="small"
                                sx={{ height: 22, fontSize: "0.7rem", color: "#86efac", bgcolor: "rgba(134,239,172,0.12)", border: "1px solid rgba(134,239,172,0.3)" }}
                            />
                        </Stack>
                    </Box>

                    {/* line items */}
                    <Box
                        sx={{
                            borderRadius: "14px",
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.02)",
                            px: 2,
                            py: 1.5,
                        }}
                    >
                        <Row label="Plan" value={`${session.product_name} (${session.tier})`} />
                        <Row label="Billing" value={periodLabel(session.interval, session.interval_count)} />
                        {session.prefill?.email && <Row label="Account" value={session.prefill.email} />}
                    </Box>

                    {/* total */}
                    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", py: 1, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <Typography sx={{ color: "rgba(245,245,244,0.7)", fontWeight: 600 }}>Total due</Typography>
                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.7 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: "2rem" }}>
                                {formatAmount(session.amount, session.currency)}
                            </Typography>
                            <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.85rem" }}>
                                {periodShort(session.interval, session.interval_count)}
                            </Typography>
                        </Box>
                    </Box>

                    <Button onClick={pay} disabled={phase === "paying"} sx={primaryBtn}>
                        {phase === "paying"
                            ? session.test_mode
                                ? "Completing…"
                                : "Opening Razorpay…"
                            : `${session.test_mode ? "Simulate payment · " : "Pay "}${formatAmount(session.amount, session.currency)}`}
                    </Button>

                    <Button onClick={goBack} disabled={phase === "paying"} startIcon={<ArrowBackIcon sx={{ fontSize: "1rem !important" }} />} sx={cancelBtn}>
                        Cancel and go back
                    </Button>

                    <Stack direction="row" spacing={0.7} alignItems="center" justifyContent="center" sx={{ pt: 0.5 }}>
                        <LockIcon sx={{ fontSize: 13, color: "rgba(245,245,244,0.4)" }} />
                        <Typography sx={{ color: "rgba(245,245,244,0.4)", fontSize: "0.76rem" }}>
                            Secured by Razorpay · Powered by Elixpo Pay
                        </Typography>
                    </Stack>
                </Stack>
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
        </Card>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, gap: 2 }}>
            <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.85rem", flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography sx={{ color: "rgba(245,245,244,0.85)", fontSize: "0.85rem", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {value}
            </Typography>
        </Stack>
    );
}

function Card({ children, testMode }: { children: ReactNode; testMode?: boolean }) {
    return (
        <Box sx={{ position: "relative", minHeight: "100vh", display: "grid", placeItems: "center", p: 2, color: "#f5f5f4" }}>
            <BackgroundAurora variant="auth" />
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    maxWidth: 440,
                    p: { xs: 3, md: 4 },
                    borderRadius: "20px",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 100%)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                        <Box component="img" src="/mark.png" alt="Elixpo Pay" sx={{ height: 28, width: 28, borderRadius: "8px", display: "block" }} />
                        <Typography sx={{ fontWeight: 700 }}>
                            Elixpo <Box component="span" sx={{ color: "#9b7bf7" }}>Pay</Box>
                        </Typography>
                    </Stack>
                    {testMode && (
                        <Chip
                            label="TEST MODE"
                            size="small"
                            sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.04em", color: "#fbbf24", bgcolor: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)" }}
                        />
                    )}
                </Stack>
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
    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
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
    "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
};

export default function CheckoutPage() {
    return (
        <Suspense
            fallback={
                <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#0b0d12" }}>
                    <CircularProgress sx={{ color: "#9b7bf7" }} />
                </Box>
            }
        >
            <CheckoutInner />
        </Suspense>
    );
}
