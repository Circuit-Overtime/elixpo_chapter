"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ShieldIcon from "@mui/icons-material/VerifiedUser";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import BackgroundAurora from "../components/background-aurora";

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
    "&:hover": {
        color: "#fff",
        borderColor: "rgba(155,123,247,0.45)",
        background: "rgba(155,123,247,0.08)",
    },
};

function LoginInner() {
    const error = useSearchParams().get("error");

    return (
        <Box
            sx={{
                position: "relative",
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                p: 2,
                color: "#f5f5f4",
            }}
        >
            <BackgroundAurora variant="auth" />
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    maxWidth: 430,
                    p: { xs: 3.5, md: 4.5 },
                    borderRadius: "24px",
                    textAlign: "center",
                    background:
                        "linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%)",
                    backdropFilter: "blur(26px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow:
                        "inset 0 1px 1px rgba(255,255,255,0.08), 0 30px 70px rgba(0,0,0,0.55)",
                }}
            >
                {/* logo badge */}
                <Box
                    component="img"
                    src="/mark.png"
                    alt="Elixpo Pay"
                    sx={{
                        height: 60,
                        width: 60,
                        mx: "auto",
                        mb: 2.5,
                        borderRadius: "16px",
                        display: "block",
                        filter: "drop-shadow(0 10px 24px rgba(124,92,255,0.35))",
                    }}
                />

                <Typography sx={{ fontWeight: 800, fontSize: "1.7rem", letterSpacing: "-0.01em" }}>
                    Merchant sign in
                </Typography>

                {error && (
                    <Box
                        sx={{
                            mt: 2.5,
                            px: 2,
                            py: 1.2,
                            borderRadius: "12px",
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: "#f87171",
                            fontSize: "0.85rem",
                        }}
                    >
                        Sign-in failed ({error}). Please try again.
                    </Box>
                )}

                <Button
                    component="a"
                    href="/api/auth/login"
                    fullWidth
                    sx={{
                        mt: 3.5,
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "#fff",
                        py: 1.5,
                        borderRadius: "14px",
                        background: "linear-gradient(180deg, #a98cff 0%, #7c5cff 100%)",
                        boxShadow:
                            "inset 0 1px 1px rgba(255,255,255,0.3), 0 12px 30px rgba(124,92,255,0.4)",
                        "&:hover": {
                            background: "linear-gradient(180deg, #b79dff 0%, #8a6dff 100%)",
                        },
                    }}
                >
                    Continue with Elixpo Accounts
                </Button>

                <Stack direction="row" spacing={1.2} sx={{ mt: 1.6 }}>
                    <Button component={Link} href="/" startIcon={<ArrowBackIcon sx={{ fontSize: "1rem !important" }} />} sx={ghostBtn}>
                        Back home
                    </Button>
                    <Button component={Link} href="/docs" startIcon={<MenuBookIcon sx={{ fontSize: "1.05rem !important" }} />} sx={ghostBtn}>
                        Read the docs
                    </Button>
                </Stack>

                <Stack direction="row" spacing={0.7} alignItems="center" justifyContent="center" sx={{ mt: 3 }}>
                    <ShieldIcon sx={{ fontSize: 14, color: "rgba(245,245,244,0.4)" }} />
                    <Typography sx={{ color: "rgba(245,245,244,0.4)", fontSize: "0.78rem" }}>
                        Secured by Elixpo Accounts
                    </Typography>
                </Stack>
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
