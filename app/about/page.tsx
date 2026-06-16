"use client";

import { Box, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import PageShell from "../components/page-shell";

const BLOCKS: { title: string; body: string; accent: string }[] = [
    {
        title: "Hosted checkout",
        body: "A signed handoff from your app opens a branded, edge-served payment page. Razorpay (INR) ships first; Stripe, PayPal and UPI slot in behind one adapter interface. Your servers never see card data, keeping PCI scope minimal.",
        accent: "#9b7bf7",
    },
    {
        title: "Unified ledger",
        body: "Every money movement is recorded as an immutable, double-entry transaction. Idempotency keys guard each operation and webhooks are replay-safe — so balances reconcile against provider reports and nothing is charged twice.",
        accent: "#5fb6ff",
    },
    {
        title: "Entitlements & grants",
        body: "A successful charge grants a tier with an expiry, emits a signed entitlement.updated webhook, and is queryable at /v1/entitlements. Your app stores the resulting tier locally and trusts a single source of truth for access.",
        accent: "#86efac",
    },
    {
        title: "Provider adapters",
        body: "Charge-in and pay-out rails sit behind a common interface — createCheckout, charge, refund, verifyWebhook, createPayout. Add a provider once and every product on Elixpo Pay can use it.",
        accent: "#fbbf24",
    },
    {
        title: "Creator payouts",
        body: "Subscriber-pool splits, marketplace payouts and revenue-share credit creator wallets and settle via RazorpayX or Stripe Connect, with payout thresholds, schedules and KYC gating built in.",
        accent: "#c4b5fd",
    },
    {
        title: "Merchant dashboard",
        body: "Sign in with Elixpo Accounts to manage products, regional pricing, API keys and webhooks, and watch revenue, entitlements and transactions update in real time.",
        accent: "#ff7cc9",
    },
];

const ROADMAP: { phase: string; title: string; body: string; done?: boolean }[] = [
    {
        phase: "P0",
        title: "First-party billing",
        body: "Razorpay INR, hosted checkout with signed handoff, subscriptions, the grant webhook and entitlements API, and a merchant dashboard — powering blogs.elixpo today.",
        done: true,
    },
    {
        phase: "P1",
        title: "Ledger & payouts",
        body: "Creator wallets, the subscriber-pool split engine, and payouts via RazorpayX / Stripe Connect with KYC.",
    },
    {
        phase: "P2",
        title: "Open multi-tenant SaaS",
        body: "Self-serve merchant signup, bring-your-own provider keys, API keys, webhooks, multi-provider, customer portal and tax.",
    },
    {
        phase: "P3",
        title: "Marketplace & intelligence",
        body: "Marketplace and usage-based billing, more providers, merchant-of-record, analytics and fraud tooling.",
    },
];

export default function AboutPage() {
    return (
        <PageShell>
            <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 9 }, pb: { xs: 6, md: 10 } }}>
                <Stack alignItems="center" textAlign="center" spacing={2} sx={{ mb: { xs: 5, md: 8 } }}>
                    <Typography sx={{ color: "#b69aff", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        The platform
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: "2.2rem", md: "3rem" }, letterSpacing: "-0.02em", lineHeight: 1.05, color: "#f5f5f4" }}>
                        One money stack, six building blocks
                    </Typography>
                    <Typography sx={{ maxWidth: 640, color: "rgba(245,245,244,0.65)", fontSize: "1.05rem", lineHeight: 1.7 }}>
                        Elixpo Pay abstracts providers and rails behind one API, ledger
                        and dashboard — built end to end on Cloudflare's edge with D1,
                        KV and Workers, so money moves reliably for every Elixpo product
                        and every business building on it.
                    </Typography>
                </Stack>

                {/* Building blocks */}
                <Box
                    sx={{
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                        mb: { xs: 6, md: 9 },
                    }}
                >
                    {BLOCKS.map((b) => (
                        <Box
                            key={b.title}
                            sx={{
                                p: { xs: 2.6, md: 3 },
                                borderRadius: "18px",
                                background: "#0e1117",
                                border: "1px solid rgba(255,255,255,0.05)",
                                boxShadow: "8px 8px 24px rgba(0,0,0,0.45), -6px -6px 18px rgba(255,255,255,0.02)",
                            }}
                        >
                            <Stack direction="row" spacing={1.4} alignItems="center" sx={{ mb: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: "3px", background: b.accent, boxShadow: `0 0 10px ${b.accent}aa` }} />
                                <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#f5f5f4" }}>
                                    {b.title}
                                </Typography>
                            </Stack>
                            <Typography sx={{ color: "rgba(245,245,244,0.62)", fontSize: "0.92rem", lineHeight: 1.65 }}>
                                {b.body}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Roadmap */}
                <Typography sx={{ textAlign: "center", fontWeight: 800, fontSize: { xs: "1.7rem", md: "2.2rem" }, letterSpacing: "-0.02em", color: "#f5f5f4", mb: { xs: 4, md: 6 } }}>
                    Where it's headed
                </Typography>
                <Stack spacing={2}>
                    {ROADMAP.map((r) => (
                        <Stack
                            key={r.phase}
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            sx={{
                                p: { xs: 2.6, md: 3 },
                                borderRadius: "16px",
                                background: "#0e1117",
                                border: r.done ? "1px solid rgba(134,239,172,0.3)" : "1px solid rgba(255,255,255,0.05)",
                                boxShadow: "8px 8px 24px rgba(0,0,0,0.4), -6px -6px 16px rgba(255,255,255,0.02)",
                            }}
                        >
                            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 140 }}>
                                <Typography sx={{ fontFamily: "var(--font-geist-mono)", fontWeight: 800, fontSize: "1.1rem", color: r.done ? "#86efac" : "#9b7bf7" }}>
                                    {r.phase}
                                </Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "#f5f5f4" }}>
                                    {r.title}
                                </Typography>
                                {r.done && (
                                    <Box sx={{ px: 0.9, py: 0.2, borderRadius: "999px", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", color: "#86efac", background: "rgba(134,239,172,0.12)", border: "1px solid rgba(134,239,172,0.3)" }}>
                                        Live
                                    </Box>
                                )}
                            </Stack>
                            <Typography sx={{ color: "rgba(245,245,244,0.62)", fontSize: "0.92rem", lineHeight: 1.65 }}>
                                {r.body}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>

                {/* CTA */}
                <Stack alignItems="center" spacing={2} sx={{ mt: { xs: 6, md: 9 } }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.4rem", color: "#f5f5f4", textAlign: "center" }}>
                        Ready to start charging?
                    </Typography>
                    <Stack direction="row" spacing={2}>
                        <Box
                            component={Link}
                            href="/login"
                            sx={{
                                textDecoration: "none",
                                fontWeight: 700,
                                color: "#fff",
                                px: 3,
                                py: 1.2,
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                            }}
                        >
                            Start building
                        </Box>
                        <Box
                            component={Link}
                            href="/docs"
                            sx={{
                                textDecoration: "none",
                                fontWeight: 700,
                                color: "#f5f5f4",
                                px: 3,
                                py: 1.2,
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.16)",
                            }}
                        >
                            Read the docs
                        </Box>
                    </Stack>
                </Stack>
            </Container>
        </PageShell>
    );
}
