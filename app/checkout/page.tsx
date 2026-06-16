"use client";

import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Suspense, useEffect, useState } from "react";
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
    amount: number;
    currency: string;
    product_name: string;
    tier: string;
    prefill: { email?: string };
    return_url: string | null;
}

const SYMBOLS: Record<string, string> = { INR: "₹", USD: "$" };

function formatAmount(minor: number, currency: string): string {
    const symbol = SYMBOLS[currency] ?? "";
    return `${symbol}${(minor / 100).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
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

type Phase = "loading" | "ready" | "paying" | "success" | "error";

function CheckoutInner() {
    const params = useSearchParams();
    const token = params.get("token");

    const [phase, setPhase] = useState<Phase>("loading");
    const [error, setError] = useState<string>("");
    const [session, setSession] = useState<SessionData | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!token) {
                setError("Missing checkout token.");
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
                const data = await res.json();
                if (!res.ok) throw new Error(data.error_description || data.error);
                if (cancelled) return;
                setSession(data);
                setPhase("ready");
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.message || "Failed to start checkout.");
                setPhase("error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const pay = async () => {
        if (!session || !window.Razorpay) return;
        setPhase("paying");
        const rzp = new window.Razorpay({
            key: session.key_id,
            order_id: session.order_id,
            amount: session.amount,
            currency: session.currency,
            name: "Elixpo Pay",
            description: `${session.product_name}`,
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
                    const vd = await v.json();
                    if (!v.ok) throw new Error(vd.error || "verification_failed");
                    setPhase("success");
                    const back = vd.return_url || session.return_url;
                    if (back) setTimeout(() => (window.location.href = back), 2200);
                } catch (e: any) {
                    setError(e?.message || "Payment verification failed.");
                    setPhase("error");
                }
            },
            modal: {
                ondismiss: () => setPhase("ready"),
            },
        });
        rzp.on("payment.failed", (resp: any) => {
            setError(resp?.error?.description || "Payment failed.");
            setPhase("error");
        });
        rzp.open();
    };

    return (
        <Card>
            {phase === "loading" && (
                <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
                    <CircularProgress sx={{ color: "#9b7bf7" }} />
                    <Typography sx={{ color: "rgba(245,245,244,0.7)" }}>
                        Preparing your checkout…
                    </Typography>
                </Stack>
            )}

            {phase === "error" && (
                <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
                    <Typography sx={{ fontSize: "2rem" }}>⚠️</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                        Something went wrong
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.6)",
                            textAlign: "center",
                            fontSize: "0.9rem",
                        }}
                    >
                        {error}
                    </Typography>
                </Stack>
            )}

            {phase === "success" && (
                <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "1.6rem",
                            background: "rgba(134,239,172,0.15)",
                            border: "1px solid rgba(134,239,172,0.4)",
                        }}
                    >
                        ✓
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.2rem" }}>
                        Payment successful
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.6)",
                            textAlign: "center",
                            fontSize: "0.9rem",
                        }}
                    >
                        Your {session?.tier} access is active. Redirecting you
                        back…
                    </Typography>
                </Stack>
            )}

            {(phase === "ready" || phase === "paying") && session && (
                <Stack spacing={3}>
                    <Box>
                        <Typography
                            sx={{
                                color: "rgba(245,245,244,0.5)",
                                fontSize: "0.8rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                            }}
                        >
                            You're paying for
                        </Typography>
                        <Typography
                            sx={{ fontWeight: 700, fontSize: "1.4rem", mt: 0.5 }}
                        >
                            {session.product_name}
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 1,
                            py: 2,
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <Typography
                            sx={{ fontWeight: 800, fontSize: "2.4rem" }}
                        >
                            {formatAmount(session.amount, session.currency)}
                        </Typography>
                        <Typography
                            sx={{ color: "rgba(245,245,244,0.5)" }}
                        >
                            / 30 days
                        </Typography>
                    </Box>

                    <Button
                        onClick={pay}
                        disabled={phase === "paying"}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "#fff",
                            py: 1.4,
                            borderRadius: "12px",
                            background:
                                "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                            boxShadow: "0 6px 20px rgba(155,123,247,0.4)",
                            "&:hover": {
                                background:
                                    "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
                            },
                            "&.Mui-disabled": {
                                opacity: 0.6,
                                color: "#fff",
                            },
                        }}
                    >
                        {phase === "paying"
                            ? "Opening Razorpay…"
                            : `Pay ${formatAmount(session.amount, session.currency)}`}
                    </Button>

                    <Typography
                        sx={{
                            textAlign: "center",
                            color: "rgba(245,245,244,0.4)",
                            fontSize: "0.78rem",
                        }}
                    >
                        Secured by Razorpay · Powered by Elixpo Pay
                    </Typography>
                </Stack>
            )}
        </Card>
    );
}

function Card({ children }: { children: React.ReactNode }) {
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
                    maxWidth: 420,
                    p: { xs: 3, md: 4 },
                    borderRadius: "20px",
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 100%)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                }}
            >
                <Stack
                    direction="row"
                    spacing={1.2}
                    alignItems="center"
                    sx={{ mb: 3 }}
                >
                    <Box
                        sx={{
                            height: 28,
                            width: 28,
                            borderRadius: "8px",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 800,
                            color: "#fff",
                            background:
                                "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        }}
                    >
                        ₹
                    </Box>
                    <Typography sx={{ fontWeight: 700 }}>
                        Elixpo{" "}
                        <Box component="span" sx={{ color: "#9b7bf7" }}>
                            Pay
                        </Box>
                    </Typography>
                </Stack>
                {children}
            </Box>
        </Box>
    );
}

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
