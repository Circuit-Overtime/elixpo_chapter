"use client";

import CheckIcon from "@mui/icons-material/Check";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import PageShell from "../components/page-shell";

interface Tier {
    name: string;
    price: string;
    unit: string;
    rate: string;
    blurb: string;
    features: string[];
    cta: string;
    href: string;
    popular?: boolean;
}

const TIERS: Tier[] = [
    {
        name: "Starter",
        price: "Free",
        unit: "to start",
        rate: "2.0% + ₹3",
        blurb: "Launch your first paid product.",
        features: [
            "Hosted checkout",
            "Entitlements + signed webhooks",
            "1 app, Razorpay (INR)",
            "Unified ledger & dashboard",
            "Community support",
        ],
        cta: "Start free",
        href: "/login",
    },
    {
        name: "Growth",
        price: "₹1,999",
        unit: "/mo + usage",
        rate: "1.5% + ₹3",
        blurb: "Scale revenue across products.",
        features: [
            "Everything in Starter",
            "Creator payouts (RazorpayX)",
            "Unlimited apps & multiple providers",
            "Bring-your-own provider keys",
            "Priority support",
        ],
        cta: "Choose Growth",
        href: "/login",
        popular: true,
    },
    {
        name: "Scale",
        price: "Custom",
        unit: "volume pricing",
        rate: "from 0.9%",
        blurb: "High volume & merchant-of-record.",
        features: [
            "Negotiated volume discounts",
            "Merchant-of-record + tax handling",
            "Custom payout schedules",
            "Dedicated support & SLA",
            "Guided onboarding",
        ],
        cta: "Contact sales",
        href: "mailto:hello@elixpo.com",
    },
];

const FEES: { label: string; value: string }[] = [
    { label: "Per successful charge", value: "1.5–2.0% + ₹3 (by plan)" },
    { label: "Payouts to creators / sellers", value: "0.25% + ₹5 per payout" },
    { label: "Refunds & disputes", value: "No Elixpo fee" },
    {
        label: "Cross-currency conversion",
        value: "+1% on the converted amount",
    },
];

export default function PricingPage() {
    return (
        <PageShell>
            <Container
                maxWidth="lg"
                sx={{ pt: { xs: 6, md: 9 }, pb: { xs: 6, md: 10 } }}
            >
                {/* Header */}
                <Stack
                    alignItems="center"
                    textAlign="center"
                    spacing={2}
                    sx={{ mb: { xs: 5, md: 7 } }}
                >
                    <Typography
                        sx={{
                            color: "#b69aff",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                        }}
                    >
                        Pricing
                    </Typography>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: "2.2rem", md: "3rem" },
                            letterSpacing: "-0.02em",
                            lineHeight: 1.05,
                            color: "#f5f5f4",
                        }}
                    >
                        Pay only when you get paid
                    </Typography>
                    <Typography
                        sx={{
                            maxWidth: 600,
                            color: "rgba(245,245,244,0.65)",
                            fontSize: "1.05rem",
                            lineHeight: 1.7,
                        }}
                    >
                        A flat platform fee on each successful transaction, on
                        top of your provider's fees. No setup cost, no monthly
                        minimum to start — Elixpo Pay only earns when you do.
                    </Typography>
                </Stack>

                {/* Tiers */}
                <Box
                    sx={{
                        display: "grid",
                        gap: 2.5,
                        gridTemplateColumns: {
                            xs: "1fr",
                            md: "repeat(3, 1fr)",
                        },
                        alignItems: "stretch",
                    }}
                >
                    {TIERS.map((t) => (
                        <Box
                            key={t.name}
                            sx={{
                                position: "relative",
                                display: "flex",
                                flexDirection: "column",
                                p: { xs: 3, md: 3.5 },
                                borderRadius: "20px",
                                background: "#0e1117",
                                border: t.popular
                                    ? "1px solid rgba(155,123,247,0.5)"
                                    : "1px solid rgba(255,255,255,0.05)",
                                boxShadow: t.popular
                                    ? "0 0 0 1px rgba(155,123,247,0.25), 0 24px 60px rgba(124,92,255,0.18), 8px 8px 26px rgba(0,0,0,0.5)"
                                    : "8px 8px 26px rgba(0,0,0,0.45), -6px -6px 18px rgba(255,255,255,0.02)",
                            }}
                        >
                            {t.popular && (
                                <Box
                                    sx={{
                                        position: "absolute",
                                        top: 16,
                                        right: 16,
                                        px: 1.1,
                                        py: 0.3,
                                        borderRadius: "999px",
                                        fontSize: "0.66rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: "#c4b5fd",
                                        background: "rgba(155,123,247,0.14)",
                                        border: "1px solid rgba(155,123,247,0.4)",
                                    }}
                                >
                                    Most popular
                                </Box>
                            )}
                            <Typography
                                sx={{
                                    fontWeight: 700,
                                    fontSize: "1.2rem",
                                    color: "#f5f5f4",
                                }}
                            >
                                {t.name}
                            </Typography>
                            <Typography
                                sx={{
                                    color: "rgba(245,245,244,0.55)",
                                    fontSize: "0.88rem",
                                    mb: 2,
                                }}
                            >
                                {t.blurb}
                            </Typography>

                            <Stack
                                direction="row"
                                alignItems="baseline"
                                spacing={1}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "2.2rem",
                                        color: "#f5f5f4",
                                    }}
                                >
                                    {t.price}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: "rgba(245,245,244,0.5)",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    {t.unit}
                                </Typography>
                            </Stack>
                            <Typography
                                sx={{
                                    color: "#86efac",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    mt: 0.5,
                                    mb: 2.5,
                                }}
                            >
                                {t.rate} per transaction
                            </Typography>

                            <Stack spacing={1.2} sx={{ mb: 3 }}>
                                {t.features.map((f) => (
                                    <Stack
                                        key={f}
                                        direction="row"
                                        spacing={1.2}
                                        alignItems="flex-start"
                                    >
                                        <CheckIcon
                                            sx={{
                                                fontSize: 18,
                                                color: "#86efac",
                                                mt: "1px",
                                            }}
                                        />
                                        <Typography
                                            sx={{
                                                color: "rgba(245,245,244,0.75)",
                                                fontSize: "0.9rem",
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {f}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>

                            <Button
                                component={
                                    t.href.startsWith("mailto:") ? "a" : Link
                                }
                                href={t.href}
                                sx={{
                                    mt: "auto",
                                    textTransform: "none",
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    py: 1.2,
                                    borderRadius: "12px",
                                    color: t.popular ? "#fff" : "#f5f5f4",
                                    background: t.popular
                                        ? "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)"
                                        : "rgba(255,255,255,0.05)",
                                    border: t.popular
                                        ? "none"
                                        : "1px solid rgba(255,255,255,0.14)",
                                    "&:hover": {
                                        background: t.popular
                                            ? "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)"
                                            : "rgba(255,255,255,0.1)",
                                    },
                                }}
                            >
                                {t.cta}
                            </Button>
                        </Box>
                    ))}
                </Box>

                {/* Fee breakdown */}
                <Box
                    sx={{
                        mt: { xs: 5, md: 7 },
                        p: { xs: 3, md: 4 },
                        borderRadius: "20px",
                        background: "#0e1117",
                        border: "1px solid rgba(255,255,255,0.05)",
                        boxShadow:
                            "8px 8px 26px rgba(0,0,0,0.45), -6px -6px 18px rgba(255,255,255,0.02)",
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: "1.2rem",
                            mb: 2,
                            color: "#f5f5f4",
                        }}
                    >
                        What you pay, line by line
                    </Typography>
                    <Stack
                        divider={
                            <Box
                                sx={{
                                    borderTop:
                                        "1px solid rgba(255,255,255,0.06)",
                                }}
                            />
                        }
                    >
                        {FEES.map((row) => (
                            <Stack
                                key={row.label}
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ py: 1.4, gap: 2 }}
                            >
                                <Typography
                                    sx={{
                                        color: "rgba(245,245,244,0.72)",
                                        fontSize: "0.95rem",
                                    }}
                                >
                                    {row.label}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: "#f5f5f4",
                                        fontWeight: 600,
                                        fontSize: "0.95rem",
                                        textAlign: "right",
                                    }}
                                >
                                    {row.value}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.45)",
                            fontSize: "0.82rem",
                            mt: 2.5,
                            lineHeight: 1.6,
                        }}
                    >
                        Provider fees (Razorpay, Stripe, PayPal) are charged by
                        the provider and are separate from Elixpo Pay's platform
                        fee. GST and applicable taxes are added per local
                        regulation.
                    </Typography>
                </Box>

                <Typography
                    sx={{
                        textAlign: "center",
                        color: "rgba(245,245,244,0.5)",
                        fontSize: "0.9rem",
                        mt: 4,
                    }}
                >
                    Questions about volume pricing?{" "}
                    <Box
                        component="a"
                        href="mailto:hello@elixpo.com"
                        sx={{ color: "#9b7bf7", textDecoration: "none" }}
                    >
                        Talk to us →
                    </Box>
                </Typography>
            </Container>
        </PageShell>
    );
}
