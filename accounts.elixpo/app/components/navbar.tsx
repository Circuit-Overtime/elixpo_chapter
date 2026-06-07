"use client";

import GitHubIcon from "@mui/icons-material/GitHub";
import LoginIcon from "@mui/icons-material/Login";
import {
    AppBar,
    Box,
    Button,
    Chip,
    IconButton,
    Toolbar,
    Tooltip,
    Typography,
} from "@mui/material";
import Link from "next/link";

const ACCENT = "#9b7bf7";
const REPO_URL = "https://github.com/elixpo/accounts.elixpo";

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

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, md: 1.5 },
                }}
            >
                <Tooltip title="View source on GitHub" arrow>
                    <IconButton
                        component="a"
                        href={REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View source on GitHub"
                        sx={{
                            color: "rgba(244,244,246,0.85)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "10px",
                            width: 38,
                            height: 38,
                            transition: "all 0.18s ease",
                            "&:hover": {
                                color: "#fff",
                                borderColor: "rgba(155,123,247,0.45)",
                                background: "rgba(155,123,247,0.08)",
                            },
                        }}
                    >
                        <GitHubIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Tooltip>

                <Button
                    component={Link}
                    href="/login"
                    disableElevation
                    startIcon={
                        <LoginIcon sx={{ fontSize: "1rem !important" }} />
                    }
                    sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: "#fff",
                        background:
                            "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        borderRadius: "10px",
                        px: 2.4,
                        py: 0.9,
                        boxShadow: "0 4px 14px rgba(155,123,247,0.32)",
                        transition: "all 0.2s ease",
                        "&:hover": {
                            background:
                                "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
                            boxShadow: "0 6px 20px rgba(155,123,247,0.45)",
                            transform: "translateY(-1px)",
                        },
                    }}
                >
                    Sign in
                </Button>
            </Box>
        </Toolbar>
    </AppBar>
);

export default Navbar;
