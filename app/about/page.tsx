"use client";

import { Box, Button, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import PageShell from "../components/page-shell";

const BLOCKS: { title: string; body: string; category: string }[] = [
    {
        title: "Hosted checkout",
        body: "A secure, signed handoff from your application opens a branded, edge-served checkout. Your servers never handle sensitive payment credentials, keeping compliance simple.",
        category: "PAYMENTS",
    },
    {
        title: "Unified ledger",
        body: "Record all cash flows in an immutable, double-entry ledger. Guard operations with idempotency keys and cryptographically verified webhooks to reconcile against records.",
        category: "LEDGER",
    },
    {
        title: "Entitlements & grants",
        body: "Successful charges issue entitlement grants with automated expiration. Query user access tier statuses via the API to resolve entitlement grants securely.",
        category: "ACCESS",
    },
    {
        title: "Provider adapters",
        body: "Unified collection and payout interfaces. Switch downstream processors or connect your own gateway credentials seamlessly without editing application logic.",
        category: "ROUTING",
    },
    {
        title: "Creator payouts",
        body: "Distribute split balances and marketplace revenue shares to creator wallets automatically, settling payouts directly to their bank accounts on schedules.",
        category: "PAYOUTS",
    },
    {
        title: "Merchant dashboard",
        body: "Authenticate via Elixpo Accounts to monitor transactional ledger entries, manage pricing structures, configure api keys, and trace system webhooks in real time.",
        category: "PORTAL",
    },
];

const ROADMAP: {
    phase: string;
    title: string;
    body: string;
    done?: boolean;
}[] = [
    {
        phase: "P0",
        title: "First-party billing core",
        body: "Edge-hosted checkouts, split subscriptions, webhook engines, and basic merchant dashboards. Powering active billing across Elixpo applications today.",
        done: true,
    },
    {
        phase: "P1",
        title: "Ledger ledgering & payouts",
        body: "Settle merchant and creator balances to connected bank accounts. Pool subscription splits and KYC verification gates.",
    },
    {
        phase: "P2",
        title: "Open multi-tenant SaaS",
        body: "Self-serve merchant registrations, custom payment gateway adapters, multi-provider credentials, and automated sales tax configurations.",
    },
    {
        phase: "P3",
        title: "Marketplace intelligence",
        body: "Usage-based metered billing engines, advanced analytics dashboards, automated fraud detection, and localized checkout support.",
    },
];

export default function AboutPage() {
    return (
        <PageShell variant="default">
            <Container
                maxWidth="lg"
                sx={{ pb: { xs: 8, md: 14 } }}
            >
                {/* Header */}
                <Stack
                    alignItems="center"
                    textAlign="center"
                    spacing={2}
                    sx={{ mb: { xs: 6, md: 10 } }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: "#CF4500" }} />
                        <Typography
                            sx={{
                                fontSize: "14px",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "var(--app-fg-muted)",
                                textTransform: "uppercase",
                                fontFamily: "var(--font-sofia-sans)",
                            }}
                        >
                            THE PLATFORM
                        </Typography>
                    </Stack>
                    <Typography
                        variant="h2"
                        sx={{
                            fontWeight: 500,
                            fontSize: { xs: "32px", md: "48px" },
                            letterSpacing: "-2%",
                            lineHeight: 1.1,
                            color: "var(--app-fg)",
                            fontFamily: "var(--font-sofia-sans)",
                        }}
                    >
                        One money stack, six building blocks
                    </Typography>
                    <Typography
                        sx={{
                            maxWidth: 640,
                            color: "var(--app-fg)",
                            fontSize: "16px",
                            lineHeight: 1.6,
                            fontFamily: "var(--font-sofia-sans)",
                            fontWeight: 450,
                        }}
                    >
                        Elixpo Pay streamlines payment collection, ledger reconciliation, and payout processes into a unified edge-native developer API.
                    </Typography>
                </Stack>

                {/* Building Blocks Grid */}
                <Box
                    sx={{
                        display: "grid",
                        gap: 4,
                        gridTemplateColumns: {
                            xs: "1fr",
                            md: "repeat(2, 1fr)",
                        },
                        mb: { xs: 8, md: 12 },
                    }}
                >
                    {BLOCKS.map((b) => (
                        <Box
                            key={b.title}
                            sx={{
                                p: { xs: 3.5, md: 4 },
                                borderRadius: "24px",
                                background: "var(--app-bg-2)", // Lifted Cream
                                border: "1.5px solid var(--app-overlay)",
                                boxShadow: "rgba(0, 0, 0, 0.04) 0px 4px 24px 0px",
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                                sx={{ mb: 2 }}
                            >
                                <Box
                                    sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: "#CF4500", // Signal Orange eyebrow dot
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: "11px",
                                        letterSpacing: "0.04em",
                                        color: "var(--app-fg-muted)",
                                        textTransform: "uppercase",
                                        fontFamily: "var(--font-sofia-sans)",
                                    }}
                                >
                                    {b.category}
                                </Typography>
                            </Stack>
                            <Typography
                                variant="h3"
                                sx={{
                                    fontWeight: 500,
                                    fontSize: "22px",
                                    letterSpacing: "-1%",
                                    color: "var(--app-fg)",
                                    mb: 1.5,
                                    fontFamily: "var(--font-sofia-sans)",
                                }}
                            >
                                {b.title}
                            </Typography>
                            <Typography
                                sx={{
                                    color: "var(--app-fg)", // Charcoal
                                    fontSize: "15px",
                                    lineHeight: 1.6,
                                    fontFamily: "var(--font-sofia-sans)",
                                    fontWeight: 450,
                                }}
                            >
                                {b.body}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Roadmap Header */}
                <Typography
                    variant="h2"
                    sx={{
                        textAlign: "center",
                        fontWeight: 500,
                        fontSize: { xs: "28px", md: "36px" },
                        letterSpacing: "-2%",
                        color: "var(--app-fg)",
                        mb: { xs: 4, md: 6 },
                        fontFamily: "var(--font-sofia-sans)",
                    }}
                >
                    Where the platform is headed
                </Typography>

                {/* Roadmap Stack */}
                <Stack spacing={3} sx={{ mb: { xs: 8, md: 12 } }}>
                    {ROADMAP.map((r) => (
                        <Stack
                            key={r.phase}
                            direction={{ xs: "column", sm: "row" }}
                            spacing={4}
                            sx={{
                                p: { xs: 3.5, md: 4 },
                                borderRadius: "24px",
                                background: "var(--app-bg-2)", // Lifted Cream
                                border: "1.5px solid var(--app-overlay)",
                                boxShadow: "rgba(0, 0, 0, 0.04) 0px 4px 24px 0px",
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={2}
                                alignItems="center"
                                sx={{ minWidth: 160 }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: "18px",
                                        fontWeight: 700,
                                        color: r.done ? "#CF4500" : "var(--app-fg-muted)",
                                        fontFamily: "var(--font-sofia-sans)",
                                    }}
                                >
                                    {r.phase}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontWeight: 500,
                                        fontSize: "18px",
                                        color: "var(--app-fg)",
                                        fontFamily: "var(--font-sofia-sans)",
                                    }}
                                >
                                    {r.title}
                                </Typography>
                            </Stack>

                            <Box sx={{ flexGrow: 1 }}>
                                <Typography
                                    sx={{
                                        color: "var(--app-fg)",
                                        fontSize: "15px",
                                        lineHeight: 1.5,
                                        fontFamily: "var(--font-sofia-sans)",
                                        fontWeight: 450,
                                    }}
                                >
                                    {r.body}
                                </Typography>
                            </Box>

                            {r.done && (
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: "999px",
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            color: "#FFFFFF",
                                            background: "#CF4500", // Signal Orange for compliance/consents
                                            border: "none",
                                            fontFamily: "var(--font-sofia-sans)",
                                        }}
                                    >
                                        Active
                                    </Box>
                                </Box>
                            )}
                        </Stack>
                    ))}
                </Stack>

                {/* Call to Action (CTA) */}
                <Stack
                    alignItems="center"
                    spacing={3}
                    sx={{
                        p: { xs: 4, md: 6 },
                        borderRadius: "32px",
                        background: "var(--app-ink)", // Ink Black surface
                        color: "var(--app-on-ink)",
                        textAlign: "center",
                    }}
                >
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 500,
                            fontSize: { xs: "24px", md: "32px" },
                            letterSpacing: "-2%",
                            fontFamily: "var(--font-sofia-sans)",
                        }}
                    >
                        Ready to start charging?
                    </Typography>
                    <Typography
                        sx={{
                            color: "var(--app-on-ink-muted)",
                            fontSize: "16px",
                            maxWidth: "500px",
                            fontFamily: "var(--font-sofia-sans)",
                        }}
                    >
                        Create your merchant credential, adapt your pricing schema, and capture checkout revenue globally.
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: { xs: "100%", sm: "auto" } }}>
                        {/* Primary Button — Ink Pill (Canvas Cream bg here since background is Ink Black) */}
                        <Button
                            component={Link}
                            href="/login"
                            variant="contained"
                            disableElevation
                            sx={{
                                background: "var(--app-on-ink)", // Light pill on ink slab
                                color: "var(--app-ink)", // Ink text
                                border: "1.5px solid var(--app-on-ink)",
                                borderRadius: "20px",
                                px: 4,
                                py: 1.5,
                                fontSize: "16px",
                                fontWeight: 500,
                                textTransform: "none",
                                fontFamily: "var(--font-sofia-sans)",
                                "&:hover": {
                                    background: "var(--app-on-ink-muted)",
                                    borderColor: "var(--app-on-ink-muted)",
                                },
                            }}
                        >
                            Start Building
                        </Button>
                        {/* Secondary Button — Outlined Pill */}
                        <Button
                            component={Link}
                            href="/docs"
                            variant="outlined"
                            disableElevation
                            sx={{
                                color: "var(--app-on-ink)",
                                border: "1.5px solid var(--app-on-ink-muted)",
                                borderRadius: "20px",
                                px: 4,
                                py: 1.5,
                                fontSize: "16px",
                                fontWeight: 500,
                                textTransform: "none",
                                fontFamily: "var(--font-sofia-sans)",
                                "&:hover": {
                                    borderColor: "var(--app-on-ink)",
                                    background: "rgba(255, 255, 255, 0.05)",
                                },
                            }}
                        >
                            Read the Docs
                        </Button>
                    </Stack>
                </Stack>
            </Container>
        </PageShell>
    );
}
