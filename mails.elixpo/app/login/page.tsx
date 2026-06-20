"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ShieldIcon from "@mui/icons-material/VerifiedUser";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const ACCOUNTS_URL = "https://accounts.elixpo.com/docs";

const BENEFITS = [
    "One account across every Elixpo product — sign in once, use them all.",
    "Secure OAuth 2.0 — your password stays with Elixpo, we never see it.",
];

// Friendly copy for the ?error= values our auth callback can redirect with.
const ERROR_MESSAGES: Record<string, string> = {
    missing_code: "Sign-in didn't complete — no authorization code was returned. Please try again.",
    bad_state: "Sign-in couldn't be verified (state mismatch). Please start over.",
    sso_failed: "We couldn't reach Elixpo Accounts to sign you in. Please try again in a moment.",
};

const ghostBtn = {
    flex: 1,
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.88rem",
    color: "rgba(245,245,244,0.82)",
    py: 1.05,
    borderRadius: "12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    "&:hover": { color: "#fff", borderColor: "rgba(155,123,247,0.45)", background: "rgba(155,123,247,0.08)" },
};

function LoginInner() {
    const error = useSearchParams().get("error");
    // If already signed in, skip the login screen and go to the dashboard.
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/me", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: any) => {
                if (cancelled) return;
                if (d && d.authenticated) window.location.replace("/dashboard");
                else setChecking(false);
            })
            .catch(() => {
                if (!cancelled) setChecking(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (checking) {
        return (
            <Box sx={{ position: "relative", minHeight: "100vh", display: "grid", placeItems: "center", p: 2, color: "#f5f5f4" }}>
                <CircularProgress sx={{ color: "#9b7bf7", position: "relative", zIndex: 1 }} />
            </Box>
        );
    }

    const errorText = error ? (ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again.") : null;

    return (
        <Box sx={{ position: "relative", minHeight: "100vh", display: "grid", placeItems: "center", p: 2, color: "#f5f5f4" }}>
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    maxWidth: 460,
                    p: { xs: 3.5, md: 4 },
                    borderRadius: "24px",
                    textAlign: "center",
                    background: "linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%)",
                    backdropFilter: "blur(26px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.08), 0 30px 70px rgba(0,0,0,0.55)",
                }}
            >
                <Box component="img" src="/mark.png" alt="mail.elixpo" sx={{ height: 60, width: 60, mx: "auto", mb: 2, borderRadius: "16px", display: "block", filter: "drop-shadow(0 10px 24px rgba(124,92,255,0.35))" }} />

                <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", letterSpacing: "-0.01em" }}>
                    Sign in to Elixpo Mails
                </Typography>
                <Typography sx={{ color: "rgba(245,245,244,0.6)", fontSize: "0.92rem", mt: 0.8 }}>
                    Manage your senders, templates, and transactional sends.
                </Typography>

                {errorText && (
                    <Box sx={{ mt: 2.5, px: 2, py: 1.2, borderRadius: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "0.85rem" }}>
                        {errorText}
                    </Box>
                )}

                <Button
                    component="a"
                    href="/api/auth/login"
                    fullWidth
                    endIcon={<ArrowForwardIcon sx={{ fontSize: "1.1rem !important" }} />}
                    sx={{
                        mt: 3,
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "#fff",
                        py: 1.5,
                        borderRadius: "14px",
                        background: "linear-gradient(180deg, #a98cff 0%, #7c5cff 100%)",
                        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.3), 0 12px 30px rgba(124,92,255,0.4)",
                        "&:hover": { background: "linear-gradient(180deg, #b79dff 0%, #8a6dff 100%)" },
                    }}
                >
                    Continue with Elixpo Accounts
                </Button>

                {/* ── Explainer: what Elixpo Accounts is ──────────────────────── */}
                <Box
                    sx={{
                        mt: 3,
                        p: 2.2,
                        borderRadius: "16px",
                        textAlign: "left",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <ShieldIcon sx={{ fontSize: 16, color: "#9b7bf7" }} />
                        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
                            New here? What is Elixpo Accounts?
                        </Typography>
                    </Stack>
                    <Typography sx={{ color: "rgba(245,245,244,0.62)", fontSize: "0.84rem", lineHeight: 1.6, mb: 1.5 }}>
                        Elixpo Mails doesn't have its own password. It uses{" "}
                        <strong style={{ color: "#f5f5f4" }}>Elixpo Accounts</strong> — the single,
                        secure sign-on shared across the whole Elixpo ecosystem. One identity, everywhere.
                    </Typography>
                    <Stack spacing={1}>
                        {BENEFITS.map((b) => (
                            <Stack key={b} direction="row" spacing={1} alignItems="flex-start">
                                <CheckCircleIcon sx={{ fontSize: 15, color: "#86efac", mt: "2px", flexShrink: 0 }} />
                                <Typography sx={{ color: "rgba(245,245,244,0.7)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                                    {b}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                    <Box
                        component="a"
                        href={ACCOUNTS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            mt: 1.5,
                            color: "#9b7bf7",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            "&:hover": { color: "#b69aff" },
                        }}
                    >
                        Learn more about Elixpo Accounts
                        <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </Box>
                </Box>

                <Stack direction="row" spacing={1.2} sx={{ mt: 2.5 }}>
                    <Button component={Link} href="/" startIcon={<ArrowBackIcon sx={{ fontSize: "1rem !important" }} />} sx={ghostBtn}>
                        Back home
                    </Button>
                    <Button component={Link} href="/docs" startIcon={<MenuBookIcon sx={{ fontSize: "1.05rem !important" }} />} sx={ghostBtn}>
                        Read the docs
                    </Button>
                </Stack>

                <Typography sx={{ color: "rgba(245,245,244,0.38)", fontSize: "0.74rem", mt: 2 }}>
                    🔒 Secured by Elixpo Accounts · OAuth 2.0
                </Typography>
            </Box>
        </Box>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginInner />
        </Suspense>
    );
}
