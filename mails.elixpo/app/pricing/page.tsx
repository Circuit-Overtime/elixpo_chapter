"use client";

// NOTE: Prices below are PLACEHOLDERS and billing is NOT wired yet.
// All CTAs route to /api/auth/login (sign-up via Elixpo Accounts); no
// checkout exists today. Future: paid plans + metered billing via Elixpo Pay.

import type { SvgIconComponent } from "@mui/icons-material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BusinessIcon from "@mui/icons-material/Business";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import PageShell from "../components/page-shell";
import PricingFaq, { type Faq } from "../components/pricing-faq";

const ACCENT = "#9b7bf7";
const TEXT = "#f5f5f4";
const TEXT_60 = "rgba(245,245,244,0.6)";
const TEXT_65 = "rgba(245,245,244,0.65)";
const BORDER = "rgba(255,255,255,0.07)";
const SURFACE = "#13161d";

const PRIMARY_BTN = {
    textTransform: "none" as const,
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#fff",
    px: 3,
    py: 1.2,
    borderRadius: "12px",
    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
    boxShadow: "0 8px 24px rgba(124,92,255,0.4)",
    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
};

const GHOST_BTN = {
    textTransform: "none" as const,
    fontWeight: 700,
    fontSize: "0.95rem",
    color: TEXT,
    px: 3,
    py: 1.2,
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.16)",
    "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
};

interface Tier {
    name: string;
    price: string;
    cadence: string;
    blurb: string;
    features: string[];
    cta: string;
    popular?: boolean;
}

const TIERS: Tier[] = [
    {
        name: "Starter",
        price: "$0",
        cadence: "/mo",
        blurb: "Everything you need to ship your first transactional emails.",
        features: [
            "1 product",
            "5 templates",
            "1 sender",
            "1,000 sends / month",
            "7-day delivery logs",
            "Community support",
        ],
        cta: "Get started",
    },
    {
        name: "Pro",
        price: "$19",
        cadence: "/mo",
        blurb: "For growing teams sending real transactional volume.",
        features: [
            "10 products",
            "Unlimited templates",
            "5 senders",
            "25,000 sends / month",
            "30-day delivery logs",
            "Secret rotation",
            "Email support",
        ],
        cta: "Start Pro",
        popular: true,
    },
    {
        name: "Scale",
        price: "$99",
        cadence: "/mo",
        blurb: "High-volume sending with priority support and an SLA.",
        features: [
            "Unlimited products",
            "Unlimited senders",
            "250,000 sends / month",
            "90-day delivery logs",
            "Priority support",
            "Uptime SLA",
        ],
        cta: "Start Scale",
    },
];

const FAQS: Faq[] = [
    {
        q: "Do I bring my own sender?",
        a: "Yes. You connect your own mailbox — an email address and an app password — and we send through it. Your domain, your reputation. Credentials are encrypted at rest and never returned to the dashboard.",
    },
    {
        q: "What counts as a send?",
        a: "Each successful delivery to a single recipient triggered through a webhook counts as one send. Failed sends that never leave our system are not counted against your monthly allowance.",
    },
    {
        q: "Can I change plans?",
        a: "You can upgrade or downgrade at any time. Upgrades take effect immediately; downgrades apply at the start of your next billing cycle so you keep what you've paid for. (Billing is launching soon.)",
    },
    {
        q: "Is there a free tier?",
        a: "Yes — the Starter plan is free forever and includes 1,000 sends a month, one product, one sender, and five templates. No card required to get started.",
    },
    {
        q: "What if I need more volume?",
        a: "Reach out about Enterprise. We offer custom send volumes, dedicated support, and tailored terms for high-scale and regulated workloads.",
    },
];

function TierCard({ tier }: { tier: Tier }) {
    return (
        <Box
            sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                borderRadius: "16px",
                p: { xs: 3, md: 3.5 },
                background: tier.popular
                    ? "linear-gradient(160deg, rgba(155,123,247,0.12) 0%, rgba(124,92,255,0.04) 100%)"
                    : SURFACE,
                border: tier.popular ? "1.5px solid rgba(155,123,247,0.55)" : `1px solid ${BORDER}`,
                boxShadow: tier.popular
                    ? "0 16px 48px rgba(124,92,255,0.18)"
                    : "0 1px 2px rgba(0,0,0,0.35)",
                height: "100%",
            }}
        >
            {tier.popular && (
                <Chip
                    label="Most popular"
                    size="small"
                    sx={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        height: 24,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        color: "#fff",
                        background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        boxShadow: "0 6px 18px rgba(124,92,255,0.4)",
                    }}
                />
            )}
            <Typography sx={{ fontWeight: 700, fontSize: "1.15rem", color: TEXT }}>
                {tier.name}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.6} sx={{ mt: 1.2 }}>
                <Typography
                    sx={{
                        fontWeight: 800,
                        fontSize: "2.6rem",
                        color: TEXT,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                    }}
                >
                    {tier.price}
                </Typography>
                <Typography sx={{ color: TEXT_60, fontSize: "0.95rem", fontWeight: 600 }}>
                    {tier.cadence}
                </Typography>
            </Stack>
            <Typography
                sx={{
                    color: TEXT_65,
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                    mt: 1.2,
                    minHeight: { md: 44 },
                }}
            >
                {tier.blurb}
            </Typography>

            <Button
                component="a"
                href="/api/auth/login"
                endIcon={<ArrowForwardIcon sx={{ fontSize: "1.05rem !important" }} />}
                fullWidth
                sx={{ ...(tier.popular ? PRIMARY_BTN : GHOST_BTN), mt: 2.5 }}
            >
                {tier.cta}
            </Button>

            <Stack spacing={1.3} sx={{ mt: 3 }}>
                {tier.features.map((f) => (
                    <Stack key={f} direction="row" spacing={1.2} alignItems="flex-start">
                        <CheckCircleIcon
                            sx={{ fontSize: 18, color: "#86efac", mt: "1px", flexShrink: 0 }}
                        />
                        <Typography
                            sx={{
                                color: "rgba(245,245,244,0.82)",
                                fontSize: "0.9rem",
                                lineHeight: 1.5,
                            }}
                        >
                            {f}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
}

export default function PricingPage() {
    return (
        <PageShell variant="default">
            <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 4, md: 6 } }}>
                {/* Heading */}
                <Stack
                    alignItems="center"
                    textAlign="center"
                    spacing={2}
                    sx={{ mb: { xs: 5, md: 7 } }}
                >
                    <Chip
                        label="Pricing"
                        sx={{
                            bgcolor: "rgba(155,123,247,0.12)",
                            color: "#c4b5fd",
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            border: "1px solid rgba(155,123,247,0.3)",
                        }}
                    />
                    <Typography
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: "2.2rem", md: "3.2rem" },
                            letterSpacing: "-0.025em",
                            lineHeight: 1.06,
                            color: TEXT,
                            maxWidth: 760,
                        }}
                    >
                        Simple pricing that scales{" "}
                        <Box component="span" sx={{ color: ACCENT }}>
                            with your sends.
                        </Box>
                    </Typography>
                    <Typography
                        sx={{
                            maxWidth: 560,
                            color: TEXT_65,
                            fontSize: { xs: "1rem", md: "1.15rem" },
                            lineHeight: 1.7,
                        }}
                    >
                        Start free, bring your own sender, and only pay as your transactional volume
                        grows. No mail infra to build, no surprises.
                    </Typography>
                </Stack>

                {/* Tier cards */}
                <Box
                    sx={{
                        display: "grid",
                        gap: { xs: 3, md: 2.5 },
                        gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                        alignItems: "stretch",
                        mt: 2,
                    }}
                >
                    {TIERS.map((t) => (
                        <TierCard key={t.name} tier={t} />
                    ))}
                </Box>
            </Container>

            {/* Enterprise strip */}
            <Container maxWidth="lg" sx={{ pb: { xs: 4, md: 6 } }}>
                <Box
                    sx={{
                        borderRadius: "16px",
                        border: `1px solid ${BORDER}`,
                        background: SURFACE,
                        p: { xs: 3, md: 4 },
                        display: "flex",
                        flexDirection: { xs: "column", md: "row" },
                        alignItems: { xs: "flex-start", md: "center" },
                        justifyContent: "space-between",
                        gap: 2.5,
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: "14px",
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                                color: ACCENT,
                                background: "rgba(155,123,247,0.12)",
                                border: "1px solid rgba(155,123,247,0.3)",
                            }}
                        >
                            <BusinessIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Box>
                            <Typography
                                sx={{ fontWeight: 700, fontSize: "1.25rem", color: TEXT, mb: 0.5 }}
                            >
                                Enterprise
                            </Typography>
                            <Typography
                                sx={{
                                    color: TEXT_65,
                                    fontSize: "0.95rem",
                                    lineHeight: 1.65,
                                    maxWidth: 560,
                                }}
                            >
                                Custom send volume, dedicated support, security review, and tailored
                                terms for high-scale and regulated workloads.
                            </Typography>
                        </Box>
                    </Stack>
                    <Button
                        component="a"
                        href="mailto:hello@elixpo.com"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: "1.05rem !important" }} />}
                        sx={{ ...GHOST_BTN, flexShrink: 0, whiteSpace: "nowrap" }}
                    >
                        Contact sales
                    </Button>
                </Box>
            </Container>

            {/* FAQ */}
            <Container maxWidth="md" sx={{ py: { xs: 5, md: 9 } }}>
                <Stack
                    alignItems="center"
                    textAlign="center"
                    spacing={1.5}
                    sx={{ mb: { xs: 4, md: 5 } }}
                >
                    <Typography
                        sx={{
                            color: ACCENT,
                            fontWeight: 700,
                            fontSize: "0.78rem",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                        }}
                    >
                        FAQ
                    </Typography>
                    <Typography
                        component="h2"
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: "1.8rem", md: "2.4rem" },
                            letterSpacing: "-0.02em",
                            color: TEXT,
                        }}
                    >
                        Questions, answered
                    </Typography>
                </Stack>
                <PricingFaq items={FAQS} />
            </Container>
        </PageShell>
    );
}
