"use client";

import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import BackgroundAurora from "../components/background-aurora";

/**
 * /pricing — public pricing page.
 *
 * Three tiers (Hobby free, Indie ₹1, Studio ₹2 — test amounts until we
 * validate autopay end-to-end, then we bump to real prices ₹1,599 / ₹8,299).
 *
 * The Indie/Studio buttons POST to /api/billing/checkout which forwards to
 * payouts.elixpo and returns a hosted-checkout URL we redirect to. Hobby
 * is the default state — no action needed.
 *
 * If the user is signed out, the upgrade buttons send them to /login?next=/pricing
 * so they sign in, then come back and can upgrade in one click.
 */

interface Tier {
    id: "hobby" | "indie" | "studio";
    name: string;
    priceLabel: string;
    priceCaption: string;
    accent: string;
    description: string;
    features: string[];
    cta: string;
    highlight?: boolean;
}

const TIERS: Tier[] = [
    {
        id: "hobby",
        name: "Hobby",
        priceLabel: "₹0",
        priceCaption: "Forever free",
        accent: "rgba(245,245,244,0.85)",
        description: "Get started with personal OAuth apps and a Studio's worth of fun.",
        features: [
            "Up to 1,000 MAU per app",
            "3 OAuth apps",
            "1 webhook endpoint per app",
            "7-day retry on failed webhooks",
            "Community support",
        ],
        cta: "Current plan",
    },
    {
        id: "indie",
        name: "Indie",
        priceLabel: "₹1",
        priceCaption: "per month (test pricing)",
        accent: "#9b7bf7",
        description: "Ship real products to real users. Lift the small-app caps.",
        features: [
            "Up to 10,000 MAU per app",
            "10 OAuth apps",
            "5 webhook endpoints per app",
            "30-day retry on failed webhooks",
            "Email support",
        ],
        cta: "Start Indie",
        highlight: true,
    },
    {
        id: "studio",
        name: "Studio",
        priceLabel: "₹2",
        priceCaption: "per month (test pricing)",
        accent: "#5fb6ff",
        description: "For studios shipping at scale. Audit logs and unlimited apps.",
        features: [
            "Up to 100,000 MAU per app",
            "Unlimited OAuth apps",
            "Unlimited webhook endpoints",
            "Audit log export",
            "Priority support",
        ],
        cta: "Start Studio",
    },
];

interface Me {
    id?: string;
    tier?: string;
    is_internal?: boolean;
}

export default function PricingPage() {
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);
    const [busyTier, setBusyTier] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then(async (r) => (r.ok ? ((await r.json()) as any) : null))
            .then((d) => setMe((d?.user ?? d) as Me | null))
            .catch(() => setMe(null))
            .finally(() => setLoading(false));
    }, []);

    const startCheckout = async (tierId: "indie" | "studio") => {
        setError(null);
        // If signed out, route through login. /login?next=... brings them
        // back here after auth.
        if (!me?.id) {
            window.location.href = `/login?next=${encodeURIComponent("/pricing")}`;
            return;
        }
        setBusyTier(tierId);
        try {
            const res = await fetch("/api/billing/checkout", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tier: tierId,
                    // Where to send the user back from the payouts hosted
                    // checkout — both on cancel (immediately) and on
                    // success (after the mandate is set up). This page is
                    // the natural landing spot: it reads /api/auth/me
                    // and will show the new tier as "Current plan".
                    return_to: `${window.location.origin}/pricing`,
                }),
            });
            const text = await res.text();
            let data: any = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                /* non-json */
            }
            if (!res.ok || !data.url) {
                setError(
                    data.error ||
                        `Couldn't start checkout (HTTP ${res.status}). Try again.`,
                );
                return;
            }
            window.location.href = data.url;
        } catch (err: any) {
            setError(err?.message || "Network error — please try again.");
        } finally {
            setBusyTier(null);
        }
    };

    return (
        <>
            <BackgroundAurora variant="default" />
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    minHeight: "100dvh",
                    px: { xs: 2.5, sm: 4 },
                    py: { xs: 6, sm: 10 },
                    color: "#f5f5f4",
                }}
            >
                <Box sx={{ maxWidth: 1100, mx: "auto" }}>
                    <Stack spacing={1.5} alignItems="center" sx={{ mb: 6 }}>
                        <Typography
                            sx={{
                                fontSize: { xs: "2rem", sm: "2.6rem" },
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                                textAlign: "center",
                            }}
                        >
                            Pricing built for indie devs and studios alike
                        </Typography>
                        <Typography
                            sx={{
                                color: "rgba(245,245,244,0.65)",
                                fontSize: "1.05rem",
                                textAlign: "center",
                                maxWidth: 640,
                            }}
                        >
                            Start free. Scale only when your apps actually have
                            users. No per-seat tax — pricing tracks monthly active
                            users so we win when you do.
                        </Typography>
                        {loading ? null : me?.is_internal ? (
                            <Box
                                sx={{
                                    mt: 2,
                                    px: 1.4,
                                    py: 0.5,
                                    borderRadius: "999px",
                                    background: "rgba(155,123,247,0.12)",
                                    border: "1px solid rgba(155,123,247,0.4)",
                                    fontSize: "0.8rem",
                                    color: "#c4b5fd",
                                }}
                            >
                                You're on an internal account — billing is bypassed.
                            </Box>
                        ) : null}
                    </Stack>

                    {error && (
                        <Box
                            sx={{
                                mb: 3,
                                p: 1.5,
                                borderRadius: "10px",
                                border: "1px solid rgba(248,113,113,0.4)",
                                background: "rgba(248,113,113,0.08)",
                                color: "#fca5a5",
                                fontSize: "0.92rem",
                                textAlign: "center",
                            }}
                        >
                            {error}
                        </Box>
                    )}

                    <Box
                        sx={{
                            display: "grid",
                            gap: 3,
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(3, 1fr)",
                            },
                        }}
                    >
                        {TIERS.map((tier) => {
                            const isCurrent =
                                (me?.tier ?? "hobby") === tier.id ||
                                (me?.is_internal && tier.id === "studio");
                            return (
                                <TierCard
                                    key={tier.id}
                                    tier={tier}
                                    isCurrent={!!isCurrent}
                                    busy={busyTier === tier.id}
                                    onSelect={() => {
                                        if (tier.id === "hobby") return;
                                        startCheckout(tier.id);
                                    }}
                                />
                            );
                        })}
                    </Box>

                    <Typography
                        sx={{
                            mt: 5,
                            textAlign: "center",
                            color: "rgba(245,245,244,0.5)",
                            fontSize: "0.85rem",
                        }}
                    >
                        Test pricing. We bump these to the real ₹1,599 (Indie) and
                        ₹8,299 (Studio) once auto-pay is validated end-to-end.
                        Charged in INR via Razorpay.
                    </Typography>
                </Box>
            </Box>
        </>
    );
}

function TierCard({
    tier,
    isCurrent,
    busy,
    onSelect,
}: {
    tier: Tier;
    isCurrent: boolean;
    busy: boolean;
    onSelect: () => void;
}) {
    return (
        <Box
            sx={{
                position: "relative",
                p: { xs: 3, sm: 3.5 },
                borderRadius: "20px",
                background: "rgba(20,18,28,0.78)",
                border: tier.highlight
                    ? "1px solid rgba(155,123,247,0.55)"
                    : "1px solid rgba(255,255,255,0.08)",
                boxShadow: tier.highlight
                    ? "0 14px 60px -20px rgba(155,123,247,0.45)"
                    : "0 4px 28px -10px rgba(0,0,0,0.4)",
                backdropFilter: "blur(14px)",
                display: "flex",
                flexDirection: "column",
                minHeight: 460,
            }}
        >
            {tier.highlight && (
                <Box
                    sx={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        px: 1,
                        py: 0.2,
                        borderRadius: "999px",
                        background: "rgba(155,123,247,0.18)",
                        border: "1px solid rgba(155,123,247,0.4)",
                        fontSize: "0.66rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#c4b5fd",
                    }}
                >
                    Most popular
                </Box>
            )}
            <Typography
                sx={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: tier.accent,
                    mb: 1,
                }}
            >
                {tier.name}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5}>
                <Typography
                    sx={{
                        fontWeight: 800,
                        fontSize: "2.4rem",
                        letterSpacing: "-0.02em",
                    }}
                >
                    {tier.priceLabel}
                </Typography>
            </Stack>
            <Typography
                sx={{
                    fontSize: "0.82rem",
                    color: "rgba(245,245,244,0.55)",
                    mb: 1.4,
                }}
            >
                {tier.priceCaption}
            </Typography>
            <Typography
                sx={{
                    fontSize: "0.92rem",
                    color: "rgba(245,245,244,0.75)",
                    mb: 2.5,
                    minHeight: 44,
                }}
            >
                {tier.description}
            </Typography>
            <Stack spacing={1} sx={{ mb: 3, flex: 1 }}>
                {tier.features.map((f) => (
                    <Stack
                        key={f}
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                    >
                        <Box
                            sx={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: tier.accent,
                                opacity: 0.18,
                                flexShrink: 0,
                                mt: 0.4,
                                position: "relative",
                                "&::after": {
                                    content: '""',
                                    position: "absolute",
                                    inset: 4,
                                    borderRadius: "50%",
                                    background: tier.accent,
                                },
                            }}
                        />
                        <Typography
                            sx={{
                                fontSize: "0.9rem",
                                color: "rgba(245,245,244,0.85)",
                            }}
                        >
                            {f}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
            <Button
                fullWidth
                disabled={busy || isCurrent || tier.id === "hobby"}
                onClick={onSelect}
                sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    py: 1.1,
                    borderRadius: "12px",
                    background:
                        tier.id === "hobby"
                            ? "rgba(255,255,255,0.04)"
                            : tier.highlight
                              ? "linear-gradient(135deg, #9b7bf7, #7c5cff)"
                              : `${tier.accent}22`,
                    color: tier.id === "hobby" ? "rgba(245,245,244,0.7)" : "#fff",
                    border:
                        tier.id === "hobby"
                            ? "1px solid rgba(255,255,255,0.12)"
                            : `1px solid ${tier.accent}55`,
                    "&:hover": {
                        background:
                            tier.id === "hobby"
                                ? "rgba(255,255,255,0.06)"
                                : tier.highlight
                                  ? "linear-gradient(135deg, #a78bfa, #8b6cff)"
                                  : `${tier.accent}33`,
                    },
                    "&.Mui-disabled": {
                        color: "rgba(245,245,244,0.4)",
                    },
                }}
            >
                {busy ? (
                    <CircularProgress size={20} sx={{ color: "#fff" }} />
                ) : isCurrent ? (
                    "Current plan"
                ) : (
                    tier.cta
                )}
            </Button>
        </Box>
    );
}
