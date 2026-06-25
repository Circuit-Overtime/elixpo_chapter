"use client";

import type { SvgIconComponent } from "@mui/icons-material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import GitHubIcon from "@mui/icons-material/GitHub";
import HubIcon from "@mui/icons-material/Hub";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import BackgroundAurora from "./components/background-aurora";
import Footer from "./components/footer";
import Navbar from "./components/navbar";
import PixelHero from "./components/pixel-hero";
import RoadmapSteps from "./components/roadmap-steps";

interface Tile {
    icon: SvgIconComponent;
    title: string;
    body: string;
    accent: string;
}

const TILES: Tile[] = [
    {
        icon: ShoppingCartCheckoutIcon,
        title: "Hosted checkout",
        body: "A signed handoff opens a branded, edge-served checkout — your code never touches a card.",
        accent: "#9b7bf7",
    },
    {
        icon: WorkspacePremiumIcon,
        title: "Entitlements & grants",
        body: "Each charge grants a tier with an expiry, fires a signed webhook, and is queryable via API.",
        accent: "#86efac",
    },
    {
        icon: VpnKeyIcon,
        title: "Bring your own keys",
        body: "Connect your own Razorpay/Stripe, or let Elixpo be merchant-of-record. You own the funds.",
        accent: "#5fb6ff",
    },
    {
        icon: AccountBalanceIcon,
        title: "Unified ledger",
        body: "Immutable double-entry, idempotent money ops, and replay-safe webhooks from day one.",
        accent: "#fbbf24",
    },
    {
        icon: AccountBalanceWalletIcon,
        title: "Creator payouts",
        body: "Pool splits, marketplace and revenue-share — settled via RazorpayX or Stripe Connect.",
        accent: "#c4b5fd",
    },
    {
        icon: HubIcon,
        title: "One identity, one API",
        body: "Sign in with Elixpo Accounts, manage products and pricing, and call a single API.",
        accent: "#ff7cc9",
    },
];

export default function Home() {
    return (
        <Box
            sx={{ position: "relative", minHeight: "100vh", color: "#f5f5f4" }}
        >
            <BackgroundAurora variant="default" />
            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Box sx={{ position: "sticky", top: 0, zIndex: 1000 }}>
                    <Navbar />
                </Box>

                <PixelHero />

                {/* ── Section 2: roadmap, right after the hero ────────────────── */}
                <RoadmapSteps />

                {/* ── Open source strip ───────────────────────────────────────── */}
                <Container maxWidth="md" sx={{ py: { xs: 2, md: 3 } }}>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                            p: { xs: 2.5, md: 3 },
                            borderRadius: "16px",
                            border: "1px solid rgba(155,123,247,0.25)",
                            background:
                                "linear-gradient(120deg, rgba(155,123,247,0.08), rgba(155,123,247,0.02))",
                        }}
                    >
                        <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
                            <Typography
                                sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#f5f5f4" }}
                            >
                                100% open source
                            </Typography>
                            <Typography
                                sx={{ color: "rgba(245,245,244,0.6)", fontSize: "0.9rem", mt: 0.3 }}
                            >
                                Audit every line, self-host it, or contribute — no black boxes
                                handling your money.
                            </Typography>
                        </Box>
                        <Button
                            component="a"
                            href="https://github.com/elixpo/payouts.elixpo"
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<GitHubIcon />}
                            sx={{
                                flexShrink: 0,
                                textTransform: "none",
                                fontWeight: 700,
                                color: "#fff",
                                px: 2.6,
                                py: 1,
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                "&:hover": {
                                    background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
                                },
                            }}
                        >
                            View on GitHub
                        </Button>
                    </Stack>
                </Container>

                {/* ── Section 3: The platform ─────────────────────────────────── */}
                <Box
                    id="platform"
                    sx={{
                        position: "relative",
                        py: { xs: 7, md: 11 },
                        scrollMarginTop: "80px",
                    }}
                >
                    <Container maxWidth="lg" sx={{ position: "relative" }}>
                        <Stack
                            alignItems="center"
                            textAlign="center"
                            spacing={1.5}
                            sx={{ mb: { xs: 4, md: 6 } }}
                        >
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    fontSize: { xs: "2.2rem", md: "3rem" },
                                    letterSpacing: "-0.02em",
                                    lineHeight: 1.05,
                                    color: "#f5f5f4",
                                }}
                            >
                                The platform
                            </Typography>
                            <Typography
                                sx={{
                                    maxWidth: 600,
                                    color: "rgba(245,245,244,0.65)",
                                    fontSize: "1.05rem",
                                    lineHeight: 1.7,
                                }}
                            >
                                Charge-in and pay-out, abstracted behind a
                                single API, ledger and dashboard — so you ship
                                monetization instead of plumbing.
                            </Typography>
                        </Stack>

                        <Box
                            sx={{
                                display: "grid",
                                rowGap: { xs: 4, md: 6 },
                                columnGap: 3,
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    sm: "repeat(2, 1fr)",
                                    md: "repeat(3, 1fr)",
                                },
                            }}
                        >
                            {TILES.map((tile) => (
                                <Stack
                                    key={tile.title}
                                    alignItems="center"
                                    spacing={1.4}
                                    sx={{
                                        textAlign: "center",
                                        maxWidth: 280,
                                        mx: "auto",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 54,
                                            height: 54,
                                            borderRadius: "16px",
                                            display: "grid",
                                            placeItems: "center",
                                            color: tile.accent,
                                            background: `${tile.accent}14`,
                                            border: `1px solid ${tile.accent}40`,
                                            boxShadow: `0 8px 26px ${tile.accent}26`,
                                        }}
                                    >
                                        <tile.icon sx={{ fontSize: 26 }} />
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: "1.05rem",
                                            color: "#f5f5f4",
                                        }}
                                    >
                                        {tile.title}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: "rgba(245,245,244,0.6)",
                                            fontSize: "0.88rem",
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {tile.body}
                                    </Typography>
                                </Stack>
                            ))}
                        </Box>

                        {/* Checkout artifact showcase */}
                        <Box
                            sx={{
                                mt: { xs: 5, md: 7 },
                                display: "flex",
                                flexDirection: { xs: "column", md: "row" },
                                alignItems: "center",
                                justifyContent: "center",
                                gap: { xs: 3, md: 6 },
                            }}
                        >
                            <Box
                                sx={{
                                    maxWidth: 380,
                                    textAlign: { xs: "center", md: "left" },
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: "1.3rem",
                                        mb: 1,
                                    }}
                                >
                                    A checkout your customers trust
                                </Typography>
                                <Typography
                                    sx={{
                                        color: "rgba(245,245,244,0.6)",
                                        fontSize: "0.92rem",
                                        lineHeight: 1.65,
                                    }}
                                >
                                    Branded, edge-served, and PCI-light — the
                                    buyer sees your plan and pays in two taps,
                                    while you receive a signed grant the moment
                                    money clears.
                                </Typography>
                            </Box>
                            <MockCheckout />
                        </Box>

                        <Stack
                            alignItems="center"
                            sx={{ mt: { xs: 5, md: 7 } }}
                        >
                            <Button
                                component={Link}
                                href="/about"
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    color: "#f5f5f4",
                                    px: 3,
                                    py: 1.2,
                                    borderRadius: "12px",
                                    border: "1px solid rgba(255,255,255,0.16)",
                                    "&:hover": {
                                        borderColor: "rgba(155,123,247,0.5)",
                                        background: "rgba(155,123,247,0.06)",
                                    },
                                }}
                            >
                                Explore the full platform →
                            </Button>
                        </Stack>
                    </Container>
                </Box>

                <Footer />
            </Box>
        </Box>
    );
}

/**
 * A faithful but NON-INTERACTIVE artifact of the hosted checkout — framed in a
 * faux browser window and tagged "preview" so it reads as an interface render,
 * not a button a visitor could click by mistake. pointerEvents disabled.
 */
function MockCheckout() {
    return (
        <Box
            aria-hidden
            sx={{
                position: "relative",
                maxWidth: 360,
                width: "100%",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#0b0d12",
                boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
                userSelect: "none",
                pointerEvents: "none",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.025)",
                }}
            >
                <Box sx={{ display: "flex", gap: 0.6 }}>
                    {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                        <Box
                            key={c}
                            sx={{
                                width: 9,
                                height: 9,
                                borderRadius: "50%",
                                background: c,
                                opacity: 0.55,
                            }}
                        />
                    ))}
                </Box>
                <Box
                    sx={{
                        flexGrow: 1,
                        ml: 0.5,
                        px: 1,
                        py: 0.3,
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.35)",
                        fontFamily: "var(--font-geist-mono)",
                        fontSize: "0.66rem",
                        color: "rgba(245,245,244,0.4)",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    payouts.elixpo.com/checkout
                </Box>
            </Box>

            <Box
                sx={{
                    position: "absolute",
                    top: 44,
                    right: 12,
                    px: 0.9,
                    py: 0.2,
                    borderRadius: "999px",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(245,245,244,0.5)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                }}
            >
                Preview
            </Box>

            <Box sx={{ p: 2.2 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "6px",
                            background:
                                "linear-gradient(135deg, #9b7bf7, #7c5cff)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#fff",
                        }}
                    >
                        ₹
                    </Box>
                    <Typography
                        sx={{
                            fontSize: "0.8rem",
                            color: "rgba(245,245,244,0.6)",
                        }}
                    >
                        Elixpo Pay
                    </Typography>
                </Box>
                <Typography
                    sx={{
                        fontSize: "0.75rem",
                        color: "rgba(245,245,244,0.45)",
                    }}
                >
                    Blogs Member
                </Typography>
                <Typography
                    sx={{ fontWeight: 800, fontSize: "1.6rem", mt: 0.2 }}
                >
                    ₹199{" "}
                    <Box
                        component="span"
                        sx={{
                            fontSize: "0.8rem",
                            fontWeight: 400,
                            color: "rgba(245,245,244,0.45)",
                        }}
                    >
                        / 30 days
                    </Box>
                </Typography>
                <Box
                    sx={{
                        mt: 1.5,
                        height: 38,
                        borderRadius: "10px",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#fff",
                        background:
                            "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        opacity: 0.92,
                    }}
                >
                    Pay ₹199
                </Box>
            </Box>
        </Box>
    );
}
