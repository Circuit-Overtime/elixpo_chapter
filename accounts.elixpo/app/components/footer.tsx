"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import GitHubIcon from "@mui/icons-material/GitHub";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import {
    Box,
    Button,
    IconButton,
    Snackbar,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";

const ACCENT = "#9b7bf7";
const EMAIL = "hello@elixpo.com";
const REPO_URL = "https://github.com/elixpo/accounts.elixpo";

const navLinks = [
    { label: "Sign in", href: "/login" },
    { label: "About", href: "/about" },
    { label: "Docs", href: "/docs" },
    { label: "Integrator guide", href: "/docs" },
];

const Footer = () => {
    const [copied, setCopied] = useState(false);

    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText(EMAIL);
            setCopied(true);
        } catch {
            // Fallback for older browsers / non-secure contexts
            const ta = document.createElement("textarea");
            ta.value = EMAIL;
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand("copy");
                setCopied(true);
            } catch {
                window.location.href = `mailto:${EMAIL}`;
            }
            document.body.removeChild(ta);
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
                background:
                    "linear-gradient(180deg, rgba(11,13,18,0) 0%, rgba(11,13,18,0.4) 100%)",
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
                    alignItems={{ xs: "flex-start", md: "flex-start" }}
                >
                    <Box sx={{ maxWidth: 360 }}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.2}
                            sx={{ mb: 1.2 }}
                        >
                            <Box
                                component="img"
                                src="/LOGO/logo.png"
                                alt="Elixpo"
                                sx={{
                                    height: 28,
                                    width: 28,
                                    borderRadius: "8px",
                                }}
                            />
                            <Typography
                                sx={{
                                    fontWeight: 700,
                                    fontSize: "1rem",
                                    color: "#f4f4f6",
                                    letterSpacing: "-0.01em",
                                }}
                            >
                                Elixpo{" "}
                                <Box component="span" sx={{ color: ACCENT }}>
                                    Accounts
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
                            Open OAuth 2.0 single sign-on, built on the edge.
                            Drop it into any app — Elixpo or yours — and let
                            users sign in with one account.
                        </Typography>
                    </Box>

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={{ xs: 3, sm: 6 }}
                    >
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
                                Navigate
                            </Typography>
                            <Stack spacing={1.1}>
                                {navLinks.map((l) => (
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
                                Get in touch
                            </Typography>
                            <Stack spacing={1.5} alignItems="flex-start">
                                <Tooltip
                                    title={copied ? "Copied!" : "Click to copy"}
                                    arrow
                                >
                                    <Button
                                        onClick={handleCopyEmail}
                                        startIcon={
                                            <MailOutlineIcon
                                                sx={{ fontSize: 18 }}
                                            />
                                        }
                                        endIcon={
                                            <ContentCopyIcon
                                                sx={{
                                                    fontSize: 14,
                                                    color: "rgba(255,255,255,0.5)",
                                                }}
                                            />
                                        }
                                        sx={{
                                            textTransform: "none",
                                            color: "rgba(255,255,255,0.85)",
                                            fontFamily:
                                                "var(--font-geist-mono)",
                                            fontSize: "0.85rem",
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            borderRadius: "10px",
                                            px: 1.5,
                                            py: 0.6,
                                            transition: "all 0.18s ease",
                                            "&:hover": {
                                                color: "#fff",
                                                borderColor:
                                                    "rgba(155,123,247,0.45)",
                                                background:
                                                    "rgba(155,123,247,0.08)",
                                            },
                                        }}
                                    >
                                        {EMAIL}
                                    </Button>
                                </Tooltip>
                                <IconButton
                                    component="a"
                                    href={REPO_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="View on GitHub"
                                    sx={{
                                        color: "rgba(244,244,246,0.85)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "10px",
                                        width: 36,
                                        height: 36,
                                        "&:hover": {
                                            color: "#fff",
                                            borderColor:
                                                "rgba(155,123,247,0.45)",
                                            background:
                                                "rgba(155,123,247,0.08)",
                                        },
                                    }}
                                >
                                    <GitHubIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Stack>
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
                        © {new Date().getFullYear()} Elixpo · Built on
                        Cloudflare's edge
                    </Typography>
                    <Typography sx={{ fontSize: "inherit" }}>
                        Open source · MIT
                    </Typography>
                </Box>
            </Box>

            <Snackbar
                open={copied}
                autoHideDuration={2200}
                onClose={() => setCopied(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                message={`Copied ${EMAIL} to clipboard`}
            />
        </Box>
    );
};

export default Footer;
