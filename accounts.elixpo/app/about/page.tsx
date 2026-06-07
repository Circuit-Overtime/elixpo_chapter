"use client";

import BoltIcon from "@mui/icons-material/Bolt";
import CodeIcon from "@mui/icons-material/Code";
import GitHubIcon from "@mui/icons-material/GitHub";
import HubIcon from "@mui/icons-material/Hub";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SensorsIcon from "@mui/icons-material/Sensors";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import Link from "next/link";
import BackgroundAurora from "../components/background-aurora";
import Footer from "../components/footer";
import Navbar from "../components/navbar";

const ACCENT = "#9b7bf7";
const REPO_URL = "https://github.com/elixpo/accounts.elixpo";

const features = [
    {
        icon: LockOutlinedIcon,
        title: "OAuth 2.0 Provider",
        desc: "Industry-standard authorization code flow with PKCE. Let users sign in to any app with an Elixpo account.",
    },
    {
        icon: BoltIcon,
        title: "Edge-first architecture",
        desc: "Runs on Cloudflare Workers + D1 — globally distributed, sub-50ms latency, zero cold starts.",
    },
    {
        icon: ShieldOutlinedIcon,
        title: "Secure by default",
        desc: "EdDSA JWTs, HMAC-SHA256 webhook signatures, httpOnly cookies, Web Crypto API — no Node crypto dependencies.",
    },
    {
        icon: HubIcon,
        title: "Multi-provider SSO",
        desc: "Email + password, Google, or GitHub — with automatic account linking across providers.",
    },
    {
        icon: CodeIcon,
        title: "Developer portal",
        desc: "Register OAuth apps, manage redirect URIs, view usage stats, and configure webhooks from your dashboard.",
    },
    {
        icon: SensorsIcon,
        title: "Webhooks",
        desc: "Real-time HTTP notifications for platform events — signups, OAuth authorizations, token revocations.",
    },
];

export default function AboutPage() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                color: "#f5f5f4",
                display: "flex",
                flexDirection: "column",
                position: "relative",
            }}
        >
            <BackgroundAurora variant="warm" />

            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Navbar />
            </Box>

            <Box
                component="main"
                sx={{
                    flex: 1,
                    maxWidth: "1100px",
                    width: "100%",
                    mx: "auto",
                    px: { xs: 2.5, md: 4 },
                    pt: { xs: 4, md: 6 },
                    pb: { xs: 6, md: 8 },
                    position: "relative",
                    zIndex: 1,
                }}
            >
                <Stack
                    spacing={2.5}
                    alignItems="center"
                    textAlign="center"
                    sx={{ maxWidth: "780px", mx: "auto" }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{ mb: 0.5 }}
                    >
                        <Box
                            component="img"
                            src="/LOGO/logo.png"
                            alt="Elixpo"
                            sx={{
                                height: 42,
                                width: 42,
                                borderRadius: "11px",
                            }}
                        />
                        <Chip
                            label="About"
                            size="small"
                            sx={{
                                bgcolor: "rgba(155, 123, 247, 0.12)",
                                color: ACCENT,
                                border: "1px solid rgba(155, 123, 247, 0.3)",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                fontSize: "0.7rem",
                                height: 24,
                            }}
                        />
                    </Stack>

                    <Typography
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: "2.2rem", md: "3.1rem" },
                            lineHeight: 1.1,
                            letterSpacing: "-0.025em",
                            background:
                                "linear-gradient(180deg, #ffffff 0%, #d4cce6 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        A modern identity layer{" "}
                        <Box component="span" sx={{ color: ACCENT }}>
                            for any app.
                        </Box>
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.65)",
                            fontSize: { xs: "1rem", md: "1.1rem" },
                            maxWidth: "620px",
                            lineHeight: 1.6,
                            fontFamily: "var(--font-geist-sans)",
                        }}
                    >
                        Elixpo Accounts is an open OAuth 2.0 identity provider
                        built on the edge. Authenticate users across your
                        services with a single, secure account — yours or
                        anyone's.
                    </Typography>

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        sx={{ pt: 1 }}
                    >
                        <Button
                            component={Link}
                            href="/login"
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "1rem",
                                color: "#fff",
                                background:
                                    "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                borderRadius: "12px",
                                px: 3,
                                py: 1.2,
                                boxShadow: "0 8px 24px rgba(155,123,247,0.32)",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    background:
                                        "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
                                    boxShadow:
                                        "0 12px 32px rgba(155,123,247,0.45)",
                                    transform: "translateY(-1px)",
                                },
                            }}
                        >
                            Get started
                        </Button>
                        <Button
                            component="a"
                            href={REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<GitHubIcon />}
                            sx={{
                                textTransform: "none",
                                fontWeight: 500,
                                fontSize: "1rem",
                                color: "rgba(255,255,255,0.85)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: "12px",
                                px: 3,
                                py: 1.2,
                                "&:hover": {
                                    borderColor: "rgba(155,123,247,0.4)",
                                    background: "rgba(255,255,255,0.04)",
                                },
                            }}
                        >
                            View source
                        </Button>
                    </Stack>
                </Stack>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr",
                            md: "1fr 1fr 1fr",
                        },
                        gap: 2.5,
                        mt: { xs: 6, md: 9 },
                    }}
                >
                    {features.map(({ icon: Icon, title, desc }) => (
                        <Box
                            key={title}
                            sx={{
                                p: 3,
                                borderRadius: "16px",
                                background:
                                    "linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                backdropFilter: "blur(20px)",
                                transition:
                                    "border-color 0.2s ease, transform 0.2s ease",
                                "&:hover": {
                                    borderColor: "rgba(155,123,247,0.3)",
                                    transform: "translateY(-2px)",
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    display: "inline-flex",
                                    p: 1.1,
                                    borderRadius: "10px",
                                    background: "rgba(155,123,247,0.12)",
                                    border: "1px solid rgba(155,123,247,0.25)",
                                    mb: 1.8,
                                }}
                            >
                                <Icon sx={{ color: ACCENT, fontSize: 20 }} />
                            </Box>
                            <Typography
                                sx={{
                                    fontWeight: 700,
                                    fontSize: "1rem",
                                    color: "#f5f5f4",
                                    mb: 0.8,
                                    fontFamily: "var(--font-geist-sans)",
                                }}
                            >
                                {title}
                            </Typography>
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.6)",
                                    fontSize: "0.88rem",
                                    lineHeight: 1.6,
                                    fontFamily: "var(--font-geist-mono)",
                                }}
                            >
                                {desc}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <Box
                    sx={{
                        mt: { xs: 6, md: 9 },
                        p: { xs: 3.5, md: 5 },
                        borderRadius: "20px",
                        background:
                            "linear-gradient(135deg, rgba(155,123,247,0.12) 0%, rgba(255,124,201,0.06) 100%)",
                        border: "1px solid rgba(155,123,247,0.25)",
                        display: "flex",
                        flexDirection: { xs: "column", md: "row" },
                        alignItems: { xs: "flex-start", md: "center" },
                        justifyContent: "space-between",
                        gap: 3,
                    }}
                >
                    <Box>
                        <Typography
                            sx={{
                                color: "#f5f5f4",
                                fontWeight: 700,
                                fontSize: { xs: "1.15rem", md: "1.3rem" },
                                mb: 0.8,
                                letterSpacing: "-0.015em",
                            }}
                        >
                            Fully open source
                        </Typography>
                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.62)",
                                fontSize: "0.93rem",
                                lineHeight: 1.6,
                                maxWidth: 520,
                            }}
                        >
                            Elixpo Accounts is open source and free to
                            self-host. Inspect the code, contribute, or deploy
                            your own instance.
                        </Typography>
                    </Box>
                    <Button
                        component="a"
                        href={REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={<GitHubIcon />}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: "0.95rem",
                            color: "#f5f5f4",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "12px",
                            px: 2.6,
                            py: 1.1,
                            flexShrink: 0,
                            "&:hover": {
                                background: "rgba(155,123,247,0.12)",
                                borderColor: "rgba(155,123,247,0.4)",
                            },
                        }}
                    >
                        View on GitHub
                    </Button>
                </Box>
            </Box>

            <Footer />
        </Box>
    );
}
