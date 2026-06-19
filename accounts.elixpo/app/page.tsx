"use client";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BoltIcon from "@mui/icons-material/Bolt";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import HubIcon from "@mui/icons-material/Hub";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Box, Button, Chip, Typography } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import BackgroundAurora from "./components/background-aurora";
import Footer from "./components/footer";
import Navbar from "./components/navbar";
import PixelHero from "./components/pixel-hero";

const ACCENT = "#9b7bf7";

const FEATURES = [
    {
        icon: HubIcon,
        title: "One identity, any app",
        body: "Use a single account across the Elixpo ecosystem and any third-party app that adopts our OAuth — no juggling passwords.",
        soon: false,
    },
    {
        icon: FingerprintIcon,
        title: "Passkey + WebAuthn",
        body: "Phishing-resistant, passwordless sign-in is on the way. For now you can use email + password or social providers.",
        soon: true,
    },
    {
        icon: LockOutlinedIcon,
        title: "OAuth 2.0 for everyone",
        body: "A first-class Authorization Code flow with PKCE. Drop our SSO into your own product in minutes — Elixpo or not.",
        soon: false,
    },
    {
        icon: BoltIcon,
        title: "Edge-native, instant",
        body: "Runs on Cloudflare's edge — sign-in checks complete in milliseconds, anywhere on the planet.",
        soon: false,
    },
];

export default function LandingPage() {
    // undefined = checking, true = signed in, false = signed out.
    const [authed, setAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/me", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: any) => {
                if (!cancelled) setAuthed(!!(d && d.email));
            })
            .catch(() => {
                if (!cancelled) setAuthed(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

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
            <BackgroundAurora variant="default" />

            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Navbar />
            </Box>

            <Box sx={{ position: "relative", zIndex: 1 }}>
                <PixelHero authed={authed} />
            </Box>

            <Box
                component="main"
                sx={{
                    flex: 1,
                    maxWidth: "1200px",
                    width: "100%",
                    mx: "auto",
                    px: { xs: 2.5, md: 4 },
                    pt: { xs: 4, md: 6 },
                    pb: { xs: 8, md: 12 },
                    position: "relative",
                    zIndex: 1,
                }}
            >
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr",
                        },
                        gap: 2.5,
                        mt: { xs: 7, md: 10 },
                    }}
                >
                    {FEATURES.map(({ icon: Icon, title, body, soon }) => (
                        <Box
                            key={title}
                            sx={{
                                position: "relative",
                                p: 3,
                                borderRadius: "16px",
                                background:
                                    "linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                backdropFilter: "blur(20px)",
                                transition: "border-color 0.2s ease",
                                "&:hover": {
                                    borderColor: "rgba(155,123,247,0.3)",
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mb: 2,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        p: 1.1,
                                        borderRadius: "10px",
                                        background: "rgba(155,123,247,0.12)",
                                        border: "1px solid rgba(155,123,247,0.25)",
                                    }}
                                >
                                    <Icon
                                        sx={{ color: ACCENT, fontSize: 22 }}
                                    />
                                </Box>
                                {soon && (
                                    <Chip
                                        label="Coming soon"
                                        size="small"
                                        sx={{
                                            bgcolor: "rgba(255,255,255,0.06)",
                                            color: "rgba(255,255,255,0.7)",
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            fontWeight: 600,
                                            fontSize: "0.68rem",
                                            letterSpacing: "0.04em",
                                            height: 22,
                                        }}
                                    />
                                )}
                            </Box>
                            <Typography
                                sx={{
                                    fontWeight: 700,
                                    fontSize: "1.05rem",
                                    color: "#f5f5f4",
                                    mb: 0.8,
                                    fontFamily: "var(--font-geist-sans)",
                                }}
                            >
                                {title}
                            </Typography>
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.62)",
                                    fontSize: "0.92rem",
                                    lineHeight: 1.55,
                                    fontFamily: "var(--font-geist-mono)",
                                }}
                            >
                                {body}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <Box
                    sx={{
                        mt: { xs: 8, md: 12 },
                        p: { xs: 4, md: 5 },
                        borderRadius: "20px",
                        background:
                            "linear-gradient(135deg, rgba(155,123,247,0.14) 0%, rgba(95,182,255,0.06) 100%)",
                        border: "1px solid rgba(155,123,247,0.25)",
                        textAlign: "center",
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: { xs: "1.5rem", md: "1.9rem" },
                            color: "#f5f5f4",
                            mb: 1.2,
                            letterSpacing: "-0.015em",
                        }}
                    >
                        Ready when you are.
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.65)",
                            fontSize: "1rem",
                            mb: 3,
                            maxWidth: "520px",
                            mx: "auto",
                        }}
                    >
                        Create an account in seconds or sign in if you already
                        have one. The same identity works across Elixpo and any
                        app integrating our SSO.
                    </Typography>
                    <Button
                        component={Link}
                        href="/login"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: "1rem",
                            color: "#fff",
                            background:
                                "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                            borderRadius: "12px",
                            px: 3.2,
                            py: 1.3,
                            boxShadow: "0 8px 24px rgba(155,123,247,0.35)",
                            "&:hover": {
                                background:
                                    "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
                                boxShadow: "0 12px 32px rgba(155,123,247,0.5)",
                                transform: "translateY(-1px)",
                            },
                        }}
                    >
                        Continue to sign in
                    </Button>
                </Box>
            </Box>

            <Footer />
        </Box>
    );
}
