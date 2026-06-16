"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BackgroundAurora from "../components/background-aurora";

function LoginInner() {
    const params = useSearchParams();
    const error = params.get("error");

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
                    maxWidth: 420,
                    p: { xs: 3.5, md: 4.5 },
                    borderRadius: "20px",
                    textAlign: "center",
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 100%)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                }}
            >
                <Box
                    sx={{
                        height: 44,
                        width: 44,
                        mx: "auto",
                        mb: 2.5,
                        borderRadius: "12px",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: "1.3rem",
                        color: "#fff",
                        background:
                            "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        boxShadow: "0 6px 20px rgba(155,123,247,0.4)",
                    }}
                >
                    ₹
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: "1.5rem" }}>
                    Merchant sign in
                </Typography>
                <Typography
                    sx={{
                        color: "rgba(245,245,244,0.6)",
                        fontSize: "0.92rem",
                        mt: 1,
                        mb: 3.5,
                        lineHeight: 1.6,
                    }}
                >
                    Manage your products, pricing, and payouts. Elixpo Pay uses
                    your Elixpo account — no separate password.
                </Typography>

                {error && (
                    <Box
                        sx={{
                            mb: 2.5,
                            px: 2,
                            py: 1.2,
                            borderRadius: "10px",
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
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "#fff",
                        py: 1.4,
                        borderRadius: "12px",
                        background:
                            "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        boxShadow: "0 6px 20px rgba(155,123,247,0.4)",
                        "&:hover": {
                            background:
                                "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
                        },
                    }}
                >
                    Continue with Elixpo Accounts
                </Button>

                <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="center"
                    sx={{ mt: 3 }}
                >
                    <Typography
                        component="a"
                        href="/"
                        sx={{
                            color: "rgba(245,245,244,0.45)",
                            fontSize: "0.82rem",
                            textDecoration: "none",
                            "&:hover": { color: "#fff" },
                        }}
                    >
                        ← Back home
                    </Typography>
                    <Typography
                        component="a"
                        href="/docs"
                        sx={{
                            color: "rgba(245,245,244,0.45)",
                            fontSize: "0.82rem",
                            textDecoration: "none",
                            "&:hover": { color: "#fff" },
                        }}
                    >
                        Read the docs
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
