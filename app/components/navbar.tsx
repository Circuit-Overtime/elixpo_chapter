"use client";

import { Box, Button, Chip, Stack, Toolbar, Typography } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Link from "next/link";

const ACCENT = "#9b7bf7";

const Navbar = () => (
    <AppBar
        position="sticky"
        elevation={0}
        sx={{
            background: "rgba(15, 17, 23, 0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            zIndex: 1000,
        }}
    >
        <Toolbar
            sx={{
                maxWidth: "1200px",
                width: "100%",
                mx: "auto",
                px: { xs: 2, md: 4 },
                minHeight: { xs: 60, md: 68 },
            }}
        >
            <Link
                href="/"
                style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexGrow: 1,
                }}
            >
                <Box
                    sx={{
                        height: 30,
                        width: 30,
                        borderRadius: "9px",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        color: "#fff",
                        background:
                            "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        boxShadow: "0 4px 14px rgba(155,123,247,0.35)",
                    }}
                >
                    ₹
                </Box>
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontSize: "1.15rem",
                        color: "#f4f4f6",
                        letterSpacing: "-0.01em",
                    }}
                >
                    Elixpo{" "}
                    <Box component="span" sx={{ color: ACCENT }}>
                        Pay
                    </Box>
                </Typography>
                <Chip
                    label="PAYMENTS"
                    size="small"
                    sx={{
                        bgcolor: "rgba(155, 123, 247, 0.12)",
                        color: ACCENT,
                        fontSize: "10px",
                        height: "22px",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        border: "1px solid rgba(155, 123, 247, 0.3)",
                    }}
                />
            </Link>

            <Stack direction="row" spacing={{ xs: 1, md: 1.5 }} alignItems="center">
                <Button
                    component={Link}
                    href="/docs"
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: "rgba(244,244,246,0.75)",
                        display: { xs: "none", sm: "inline-flex" },
                        "&:hover": { color: "#fff", background: "rgba(255,255,255,0.05)" },
                    }}
                >
                    Docs
                </Button>
                <Button
                    component={Link}
                    href="/login"
                    disableElevation
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: "#fff",
                        background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        borderRadius: "10px",
                        px: 2.2,
                        py: 0.8,
                        boxShadow: "0 4px 14px rgba(155,123,247,0.32)",
                        "&:hover": {
                            background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
                            boxShadow: "0 6px 20px rgba(155,123,247,0.45)",
                        },
                    }}
                >
                    Sign in
                </Button>
            </Stack>
        </Toolbar>
    </AppBar>
);

export default Navbar;
