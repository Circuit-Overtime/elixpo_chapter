"use client";

import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import BackgroundAurora from "./components/background-aurora";
import Footer from "./components/footer";
import Navbar from "./components/navbar";

const FEATURES = [
    {
        title: "Hosted checkout",
        body: "A signed handoff from your app opens a branded, edge-served checkout. Razorpay (INR) today; Stripe, PayPal and more behind the same adapter.",
        accent: "#9b7bf7",
    },
    {
        title: "Bring your own keys",
        body: "Connect your own Razorpay/Stripe accounts, or let Elixpo be merchant-of-record. You own the customer and the funds — we own the plumbing.",
        accent: "#5fb6ff",
    },
    {
        title: "Entitlements & grants",
        body: "Every charge grants a tier with an expiry, fires a signed webhook to your app, and is queryable at /v1/entitlements. No reconciliation glue to write.",
        accent: "#86efac",
    },
    {
        title: "Unified ledger",
        body: "Immutable, double-entry by design. Idempotent money ops and replay-safe webhooks from day one — wallets, payouts and pools build on top.",
        accent: "#fbbf24",
    },
    {
        title: "Creator payouts",
        body: "Subscriber-pool splits, marketplace payouts, and revenue-share — credited to creator wallets and settled via RazorpayX or Stripe Connect.",
        accent: "#c4b5fd",
    },
    {
        title: "One identity, one API",
        body: "Merchants sign in with Elixpo Accounts, manage products and pricing in the dashboard, and call one API. Like SSO — but for money.",
        accent: "#ff7cc9",
    },
];

const STEPS = [
    { n: "01", t: "Connect", d: "Sign in with Elixpo Accounts, create an app, and add your provider keys." },
    { n: "02", t: "List", d: "Define products and regional prices in the dashboard — or via the API." },
    { n: "03", t: "Collect", d: "Redirect to hosted checkout; receive grants, entitlements, and payouts." },
];

export default function Home() {
    return (
        <Box sx={{ position: "relative", minHeight: "100vh", color: "#f5f5f4" }}>
            <BackgroundAurora variant="default" />
            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Navbar />
                <Container maxWidth="md" sx={{ pt: { xs: 8, md: 13 }, pb: 4 }}>
                    <Stack spacing={3} alignItems="center" textAlign="center">
                        <Chip
                            label="Payments-as-a-Service · Cloudflare edge"
                            sx={{
                                bgcolor: "rgba(155,123,247,0.1)",
                                color: "#b69aff",
                                border: "1px solid rgba(155,123,247,0.25)",
                                fontWeight: 600,
                            }}
                        />
                        <Typography
                            component="h1"
                            sx={{
                                fontSize: { xs: "2.4rem", md: "3.7rem" },
                                fontWeight: 800,
                                lineHeight: 1.05,
                                letterSpacing: "-0.03em",
                                background:
                                    "linear-gradient(135deg, #f5f5f4 0%, #9b7bf7 35%, #86efac 65%, #fbbf24 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            Payments infrastructure
                            <br />
                            for every product
                        </Typography>
                        <Typography
                            sx={{
                                maxWidth: 640,
                                fontSize: { xs: "1rem", md: "1.18rem" },
                                color: "rgba(245,245,244,0.7)",
                                lineHeight: 1.7,
                            }}
                        >
                            Elixpo Pay is the billing layer of the Elixpo ecosystem —
                            and an open SaaS for any developer. Run checkout,
                            subscriptions, entitlements, and creator payouts behind one
                            API, with your own provider keys. It's what Elixpo Accounts
                            is to identity, for money.
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 1 }}>
                            <Button
                                component={Link}
                                href="/login"
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    fontSize: "1rem",
                                    color: "#fff",
                                    px: 3.2,
                                    py: 1.2,
                                    borderRadius: "12px",
                                    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                    boxShadow: "0 6px 20px rgba(155,123,247,0.4)",
                                    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
                                }}
                            >
                                Start building
                            </Button>
                            <Button
                                component={Link}
                                href="/docs"
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    fontSize: "1rem",
                                    color: "#f5f5f4",
                                    px: 3.2,
                                    py: 1.2,
                                    borderRadius: "12px",
                                    border: "1px solid rgba(255,255,255,0.18)",
                                    "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
                                }}
                            >
                                Read the docs
                            </Button>
                        </Stack>
                    </Stack>

                    <Box
                        sx={{
                            mt: { xs: 6, md: 10 },
                            display: "grid",
                            gap: 2.5,
                            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                        }}
                    >
                        {FEATURES.map((f) => (
                            <Box
                                key={f.title}
                                sx={{
                                    p: 3,
                                    borderRadius: "16px",
                                    background:
                                        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                                    backdropFilter: "blur(20px)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    transition: "all 0.3s ease",
                                    "&:hover": { borderColor: "rgba(255,255,255,0.3)", transform: "translateY(-4px)" },
                                }}
                            >
                                <Box sx={{ width: 36, height: 4, borderRadius: 2, mb: 2, background: f.accent }} />
                                <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", mb: 1 }}>
                                    {f.title}
                                </Typography>
                                <Typography sx={{ color: "rgba(245,245,244,0.65)", fontSize: "0.92rem", lineHeight: 1.6 }}>
                                    {f.body}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ mt: { xs: 7, md: 11 } }}>
                        <Typography sx={{ textAlign: "center", fontWeight: 800, fontSize: { xs: "1.6rem", md: "2rem" }, letterSpacing: "-0.02em", mb: 1 }}>
                            Live in three steps
                        </Typography>
                        <Typography sx={{ textAlign: "center", color: "rgba(245,245,244,0.55)", mb: 4 }}>
                            From sign-in to your first captured payment.
                        </Typography>
                        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
                            {STEPS.map((s) => (
                                <Box
                                    key={s.n}
                                    sx={{
                                        p: 3,
                                        borderRadius: "16px",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        background: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", color: "#9b7bf7", opacity: 0.8 }}>
                                        {s.n}
                                    </Typography>
                                    <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", mt: 0.5 }}>
                                        {s.t}
                                    </Typography>
                                    <Typography sx={{ color: "rgba(245,245,244,0.6)", fontSize: "0.9rem", mt: 0.5, lineHeight: 1.6 }}>
                                        {s.d}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    <Typography sx={{ mt: 7, textAlign: "center", color: "rgba(245,245,244,0.4)", fontSize: "0.85rem" }}>
                        P0 · first-party billing for blogs.elixpo · Razorpay INR · multi-tenant SaaS rolling out
                    </Typography>
                </Container>

                <Footer />
            </Box>
        </Box>
    );
}
