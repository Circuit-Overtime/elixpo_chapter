"use client";

import GitHubIcon from "@mui/icons-material/GitHub";
import LoginIcon from "@mui/icons-material/Login";
import { Box, Button, Chip, Stack, Toolbar, Typography } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";

const ACCENT = "#9b7bf7";
const REPO_URL = "https://github.com/elixpo";

const LINKS = [
    { label: "Platform", href: "/#platform" },
    { label: "Pricing", href: "/#start" },
    { label: "Docs", href: "/docs" },
    { label: "Developers", href: "/docs/quickstart" },
    { label: "Dashboard", href: "/dashboard" },
];

const Navbar = () => (
    <AppBar
        position="sticky"
        elevation={0}
        sx={{
            background: "rgba(11, 13, 18, 0.72)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            zIndex: 1000,
        }}
    >
        <Toolbar
            sx={{
                maxWidth: "1240px",
                width: "100%",
                mx: "auto",
                px: { xs: 2, md: 4 },
                minHeight: { xs: 60, md: 68 },
                gap: 1,
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
                        background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
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
                        display: { xs: "none", sm: "inline-flex" },
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

            {/* Center nav links */}
            <Stack
                direction="row"
                spacing={0.5}
                sx={{ flexGrow: 1, justifyContent: "center", display: { xs: "none", md: "flex" } }}
            >
                {LINKS.map((l) => (
                    <Button
                        key={l.label}
                        component={Link}
                        href={l.href}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: "0.88rem",
                            color: "rgba(244,244,246,0.7)",
                            px: 1.6,
                            borderRadius: "9px",
                            "&:hover": { color: "#fff", background: "rgba(255,255,255,0.05)" },
                        }}
                    >
                        {l.label}
                    </Button>
                ))}
            </Stack>

            <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

            <Stack direction="row" spacing={{ xs: 1, md: 1.2 }} alignItems="center">
                <IconButton
                    component="a"
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    sx={{
                        display: { xs: "none", sm: "inline-flex" },
                        color: "rgba(244,244,246,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        width: 38,
                        height: 38,
                        "&:hover": {
                            color: "#fff",
                            borderColor: "rgba(155,123,247,0.45)",
                            background: "rgba(155,123,247,0.08)",
                        },
                    }}
                >
                    <GitHubIcon sx={{ fontSize: 20 }} />
                </IconButton>
                <Button
                    component={Link}
                    href="/login"
                    disableElevation
                    startIcon={<LoginIcon sx={{ fontSize: "1rem !important" }} />}
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
