"use client";

import { AppBar, Box, Button, Chip, Toolbar, Typography } from "@mui/material";
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
                    component="img"
                    src="/LOGO/logo.png"
                    alt="Elixpo"
                    sx={{ height: 30, width: 30, borderRadius: "9px" }}
                />
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
                        Accounts
                    </Box>
                </Typography>
                <Chip
                    label="SSO"
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

            <Button
                component={Link}
                href="/login"
                disableElevation
                sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    color: "#fff",
                    bgcolor: ACCENT,
                    borderRadius: "8px",
                    px: 2.2,
                    py: 0.7,
                    "&:hover": { bgcolor: "#b69aff" },
                }}
            >
                Sign in
            </Button>
        </Toolbar>
    </AppBar>
);

export default Navbar;
