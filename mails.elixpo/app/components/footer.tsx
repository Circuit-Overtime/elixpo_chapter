"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import { Box, Button, Snackbar, Stack, Tooltip, Typography } from "@mui/material";
import Link from "next/link";
import { useState } from "react";

const ACCENT = "#9b7bf7";
const EMAIL = "hello@elixpo.com";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
    {
        heading: "Product",
        links: [
            { label: "Pricing", href: "/pricing" },
            { label: "Sign in", href: "/login" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Docs", href: "/docs" },
        ],
    },
    {
        heading: "Company",
        links: [
            { label: "Elixpo", href: "https://elixpo.com" },
            { label: "GitHub", href: "https://github.com/elixpo/mail.elixpo" },
            { label: "Contact", href: "mailto:hello@elixpo.com" },
        ],
    },
    {
        heading: "Legal",
        links: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Content Policy", href: "/content-policy" },
        ],
    },
];

const Footer = () => {
    const [copied, setCopied] = useState(false);

    const copyEmail = async () => {
        try {
            await navigator.clipboard.writeText(EMAIL);
            setCopied(true);
        } catch {
            window.location.href = `mailto:${EMAIL}`;
        }
    };

    return (
        <Box
            component="footer"
            sx={{
                position: "relative",
                zIndex: 1,
                mt: { xs: 6, md: 10 },
                borderTop: "1px solid rgba(255,255,255,0.08)",
                background: "linear-gradient(180deg, rgba(11,13,18,0) 0%, rgba(11,13,18,0.4) 100%)",
                backdropFilter: "blur(12px)",
            }}
        >
            <Box
                sx={{
                    maxWidth: "1200px",
                    mx: "auto",
                    px: { xs: 2.5, md: 4 },
                    py: { xs: 5, md: 6 },
                }}
            >
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={{ xs: 4, md: 6 }}
                    justifyContent="space-between"
                >
                    <Box sx={{ maxWidth: 360 }}>
                        <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 1.2 }}>
                            <Box
                                component="img"
                                src="/mark.png"
                                alt="mail.elixpo"
                                sx={{
                                    height: 28,
                                    width: 28,
                                    borderRadius: "7px",
                                    display: "block",
                                }}
                            />
                            <Typography
                                sx={{ fontWeight: 700, fontSize: "1rem", color: "#f4f4f6" }}
                            >
                                Elixpo
                                <Box component="span" sx={{ color: ACCENT }}>
                                    {" "}
                                    Mails
                                </Box>
                            </Typography>
                        </Stack>
                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.55)",
                                fontSize: "0.88rem",
                                lineHeight: 1.6,
                            }}
                        >
                            Event-based transactional email on the edge. Bring your own sender,
                            design templates with {"{{variables}}"} in a live editor, and trigger
                            sends from your service via webhook — without building mail
                            infrastructure.
                        </Typography>
                    </Box>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 3, sm: 6 }}>
                        {COLUMNS.map((col) => (
                            <Box key={col.heading}>
                                <Typography
                                    sx={{
                                        color: "rgba(255,255,255,0.45)",
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        mb: 1.4,
                                    }}
                                >
                                    {col.heading}
                                </Typography>
                                <Stack spacing={1.1}>
                                    {col.links.map((l) => (
                                        <Link
                                            key={l.label}
                                            href={l.href}
                                            style={{
                                                color: "rgba(255,255,255,0.75)",
                                                textDecoration: "none",
                                                fontSize: "0.88rem",
                                            }}
                                        >
                                            {l.label}
                                        </Link>
                                    ))}
                                </Stack>
                            </Box>
                        ))}

                        <Box>
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.45)",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    mb: 1.4,
                                }}
                            >
                                Contact
                            </Typography>
                            <Tooltip title={copied ? "Copied!" : "Click to copy"} arrow>
                                <Button
                                    onClick={copyEmail}
                                    startIcon={<MailOutlineIcon sx={{ fontSize: 18 }} />}
                                    endIcon={
                                        <ContentCopyIcon
                                            sx={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}
                                        />
                                    }
                                    sx={{
                                        textTransform: "none",
                                        color: "rgba(255,255,255,0.85)",
                                        fontFamily: "var(--font-geist-mono)",
                                        fontSize: "0.85rem",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        borderRadius: "10px",
                                        px: 1.5,
                                        py: 0.6,
                                        "&:hover": {
                                            color: "#fff",
                                            borderColor: "rgba(155,123,247,0.45)",
                                            background: "rgba(155,123,247,0.08)",
                                        },
                                    }}
                                >
                                    {EMAIL}
                                </Button>
                            </Tooltip>
                        </Box>
                    </Stack>
                </Stack>

                <Box
                    sx={{
                        mt: { xs: 4, md: 5 },
                        pt: 3,
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        justifyContent: "space-between",
                        alignItems: { xs: "flex-start", sm: "center" },
                        gap: 1.5,
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "0.8rem",
                    }}
                >
                    <Typography sx={{ fontSize: "inherit" }}>
                        © {new Date().getFullYear()} Elixpo · Built on Cloudflare's edge
                    </Typography>
                    <Typography sx={{ fontSize: "inherit" }}>
                        Transactional email infrastructure for the Elixpo ecosystem
                    </Typography>
                </Box>
            </Box>

            <Snackbar
                open={copied}
                autoHideDuration={2000}
                onClose={() => setCopied(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                message={`Copied ${EMAIL}`}
            />
        </Box>
    );
};

export default Footer;
