"use client";

import { Box, Chip, Container, Stack, Typography } from "@mui/material";
import BackgroundAurora from "./components/background-aurora";
import Navbar from "./components/navbar";

const FEATURES = [
    {
        title: "Hosted checkout",
        body: "A signed handoff from your app opens a branded checkout. Razorpay (INR) today; Stripe and more behind the same adapter.",
        accent: "#9b7bf7",
    },
    {
        title: "Entitlements & grants",
        body: "Every successful charge grants a tier with an expiry, fires a signed webhook to your app, and is queryable at /v1/entitlements.",
        accent: "#86efac",
    },
    {
        title: "Unified ledger",
        body: "Immutable, double-entry by design. Idempotent money ops and replay-safe webhooks from day one — payouts and pools build on top.",
        accent: "#fbbf24",
    },
];

export default function Home() {
    return (
        <Box sx={{ position: "relative", minHeight: "100vh", color: "#f5f5f4" }}>
            <BackgroundAurora variant="default" />
            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Navbar />
                <Container maxWidth="md" sx={{ pt: { xs: 8, md: 14 }, pb: 10 }}>
                    <Stack spacing={3} alignItems="center" textAlign="center">
                        <Chip
                            label="Payments + Payouts · Cloudflare edge"
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
                                fontSize: { xs: "2.4rem", md: "3.6rem" },
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
                            One payments layer for
                            <br />
                            the Elixpo ecosystem
                        </Typography>
                        <Typography
                            sx={{
                                maxWidth: 620,
                                fontSize: { xs: "1rem", md: "1.15rem" },
                                color: "rgba(245,245,244,0.7)",
                                lineHeight: 1.7,
                            }}
                        >
                            Elixpo Pay handles checkout, subscriptions,
                            entitlements, and creator payouts behind one API —
                            so every Elixpo product (and, soon, yours) bills
                            without re-wiring a provider each time.
                        </Typography>
                    </Stack>

                    <Box
                        sx={{
                            mt: { xs: 6, md: 10 },
                            display: "grid",
                            gap: 2.5,
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(3, 1fr)",
                            },
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
                                    "&:hover": {
                                        borderColor: "rgba(255,255,255,0.3)",
                                        transform: "translateY(-4px)",
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 4,
                                        borderRadius: 2,
                                        mb: 2,
                                        background: f.accent,
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: "1.1rem",
                                        mb: 1,
                                    }}
                                >
                                    {f.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: "rgba(245,245,244,0.65)",
                                        fontSize: "0.92rem",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {f.body}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    <Typography
                        sx={{
                            mt: 8,
                            textAlign: "center",
                            color: "rgba(245,245,244,0.4)",
                            fontSize: "0.85rem",
                        }}
                    >
                        P0 · first-party billing for blogs.elixpo · Razorpay INR
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
}
