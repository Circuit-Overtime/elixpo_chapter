"use client";

import { Box, Button, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";

// Senders brand list for the trust logos
const SENDER_BRANDS = ["Gmail", "Outlook", "Yahoo", "iCloud", "Zoho", "Proton", "Fastmail", "SMTP"];

export default function PixelHero({ authed }: { authed?: boolean | null }) {
    const signedIn = authed === true;
    const primaryHref = signedIn ? "/dashboard" : "/api/auth/login";
    const primaryLabel = signedIn ? "Go to your dashboard" : "Get started with Elixpo";
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <Box sx={{ minHeight: "100vh" }} />;

    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
                background: "#ffffff", // White editorial canvas
                color: "#212121", // Ink text
                pt: { xs: 8, md: 12 },
                pb: { xs: 6, md: 10 },
                overflow: "hidden",
            }}
        >
            <style>{`
                @keyframes pulseSlow {
                    0%, 100% { opacity: 0.15; transform: scale(1); }
                    50% { opacity: 0.25; transform: scale(1.05); }
                }
            `}</style>

            {/* Centered Hero Header */}
            <Box sx={{ maxWidth: 880, mx: "auto", px: 2.5, textAlign: "center" }}>
                {/* Taxonomy Chip */}
                <Typography
                    sx={{
                        color: "#ff7759", // Coral
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: 500,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        mb: 2.5,
                        display: "inline-block",
                    }}
                >
                    Event-based transactional email
                </Typography>

                {/* Monumental Display Headline */}
                <Typography
                    component="h1"
                    sx={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 500,
                        fontSize: { xs: "3.2rem", sm: "4.8rem", md: "5.5rem" },
                        lineHeight: 0.95,
                        letterSpacing: "-0.04em",
                        color: "#000000",
                        mb: 3,
                        "& span": {
                            fontFamily: "Georgia, serif",
                            fontStyle: "italic",
                            fontWeight: 400,
                            color: "#75758a",
                        },
                    }}
                >
                    Email <span>infrastructure</span> <br />
                    built for developers.
                </Typography>

                {/* Body paragraph */}
                <Typography
                    sx={{
                        fontFamily: "var(--font-sans)",
                        color: "#4a4a52",
                        fontSize: { xs: "1.05rem", md: "1.18rem" },
                        lineHeight: 1.6,
                        maxWidth: 620,
                        mx: "auto",
                        mb: 4.5,
                    }}
                >
                    Bring your own sender, design templates with a live preview, and send them
                    one-time to anyone — no login — or trigger them from your app via a signed
                    webhook. One branded workspace for your whole team.
                </Typography>

                {/* Actions: Pill CTA & Underlined Action Link */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={3}
                    justifyContent="center"
                    alignItems="center"
                    sx={{ mb: 8 }}
                >
                    <Button
                        component="a"
                        href={primaryHref}
                        sx={{
                            background: "#17171c", // Near-black Primary
                            color: "#ffffff",
                            borderRadius: "32px", // Pill
                            px: 3.5,
                            py: 1.4,
                            fontSize: "0.95rem",
                            fontWeight: 500,
                            textTransform: "none",
                            boxShadow: "none",
                            "&:hover": {
                                background: "#000000",
                            },
                        }}
                    >
                        {primaryLabel}
                    </Button>
                    <Button
                        component={Link}
                        href="/docs"
                        sx={{
                            color: "#17171c", // Near-black Primary text
                            fontSize: "0.95rem",
                            fontWeight: 500,
                            textTransform: "none",
                            borderRadius: "32px", // Pill
                            px: 3.5,
                            py: 1.4,
                            background: "rgba(238, 236, 231, 0.45)", // Semi-transparent Soft Stone
                            backdropFilter: "blur(12px)",
                            border: "1px solid rgba(0, 0, 0, 0.08)",
                            boxShadow:
                                "inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 2px 10px rgba(0, 0, 0, 0.02)",
                            fontFamily: "var(--font-sans)",
                            transition: "all 0.22s ease-in-out",
                            "&:hover": {
                                background: "rgba(238, 236, 231, 0.75)",
                                borderColor: "rgba(0, 0, 0, 0.16)",
                                boxShadow:
                                    "inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 4px 15px rgba(0, 0, 0, 0.05)",
                            },
                        }}
                    >
                        Explore the documentation →
                    </Button>
                </Stack>
            </Box>

            {/* Centered monochrome quiet Trust Logo Strip */}
            <Box sx={{ borderTop: "1px solid #f2f2f2", pt: 6, mt: 4 }}>
                <Container maxWidth="lg">
                    <Typography
                        sx={{
                            textAlign: "center",
                            fontSize: "12px",
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            color: "#93939f", // Muted Slate
                            textTransform: "uppercase",
                            mb: 4,
                            fontFamily: "var(--font-mono)",
                        }}
                    >
                        Compatible with any mailbox provider
                    </Typography>

                    <Stack
                        direction="row"
                        spacing={{ xs: 4, sm: 6, md: 8 }}
                        justifyContent="center"
                        alignItems="center"
                        sx={{
                            flexWrap: "wrap",
                            rowGap: 3,
                            "& span": {
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                color: "#93939f",
                                letterSpacing: "-0.01em",
                                transition: "color 0.2s ease",
                                cursor: "default",
                                "&:hover": {
                                    color: "#17171c",
                                },
                            },
                        }}
                    >
                        {SENDER_BRANDS.map((brand) => (
                            <Typography key={brand} component="span">
                                {brand}
                            </Typography>
                        ))}
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
}
