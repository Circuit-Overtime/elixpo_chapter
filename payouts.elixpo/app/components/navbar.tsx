"use client";

import CloseIcon from "@mui/icons-material/Close";
import GitHubIcon from "@mui/icons-material/GitHub";
import MenuIcon from "@mui/icons-material/Menu";
import StarIcon from "@mui/icons-material/Star";
import {
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    Drawer,
    IconButton,
    Stack,
    Toolbar,
    Typography,
} from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Me {
    name: string;
    email: string;
    avatar: string | null;
}

const ACCENT = "#9b7bf7";
const REPO = "elixpo/payouts.elixpo";
const REPO_URL = `https://github.com/${REPO}`;

const LINKS = [
    { label: "Platform", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Docs", href: "/docs" },
    { label: "Developers", href: "/docs/quickstart" },
    { label: "Dashboard", href: "/dashboard" },
];

function formatStars(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const Navbar = () => {
    const [stars, setStars] = useState<number | null>(null);
    // undefined = checking, null = signed out, Me = signed in
    const [me, setMe] = useState<Me | null | undefined>(undefined);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/me", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: unknown) => {
                const d = data as {
                    uid?: string;
                    name?: string;
                    email?: string;
                    avatar?: string | null;
                } | null;
                if (!cancelled)
                    setMe(
                        d?.uid
                            ? {
                                  name: d.name || "",
                                  email: d.email || "",
                                  avatar: d.avatar || null,
                              }
                            : null,
                    );
            })
            .catch(() => {
                if (!cancelled) setMe(null);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetch(`https://api.github.com/repos/${REPO}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data: unknown) => {
                const d = data as { stargazers_count?: number } | null;
                if (!cancelled && d && typeof d.stargazers_count === "number") {
                    setStars(d.stargazers_count);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    return (
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
                        component="img"
                        src="/mark.png"
                        alt="Elixpo Pay"
                        sx={{
                            height: 32,
                            width: 32,
                            borderRadius: "8px",
                            display: "block",
                        }}
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
                            Pay
                        </Box>
                    </Typography>
                    <Chip
                        label="PAYMENTS"
                        size="small"
                        sx={{
                            display: {
                                xs: "none",
                                "@media (min-width: 640px)": {
                                    display: "inline-flex",
                                },
                            },
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

                <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                        flexGrow: 1,
                        justifyContent: "center",
                        display: {
                            xs: "none",
                            "@media (min-width: 640px)": { display: "flex" },
                        },
                    }}
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
                                "&:hover": {
                                    color: "#fff",
                                    background: "rgba(255,255,255,0.05)",
                                },
                            }}
                        >
                            {l.label}
                        </Button>
                    ))}
                </Stack>

                <Box
                    sx={{
                        flexGrow: {
                            xs: 1,
                            "@media (min-width: 640px)": { flexGrow: 0 },
                        },
                    }}
                />

                <Stack
                    direction="row"
                    spacing={{ xs: 1, md: 1.2 }}
                    alignItems="center"
                >
                    {/* GitHub: icon | star count */}
                    <Box
                        component="a"
                        href={REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub repository"
                        sx={{
                            display: {
                                xs: "none",
                                "@media (min-width: 640px)": {
                                    display: "inline-flex",
                                },
                            },
                            alignItems: "center",
                            height: 38,
                            px: 1.3,
                            gap: 0.9,
                            borderRadius: "10px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(244,244,246,0.8)",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            transition: "all 0.18s ease",
                            "&:hover": {
                                color: "#fff",
                                borderColor: "rgba(155,123,247,0.45)",
                                background: "rgba(155,123,247,0.08)",
                            },
                        }}
                    >
                        <GitHubIcon sx={{ fontSize: 19 }} />
                        {stars !== null && (
                            <>
                                <Box
                                    sx={{
                                        width: "1px",
                                        height: 16,
                                        background: "rgba(255,255,255,0.15)",
                                    }}
                                />
                                <Stack
                                    direction="row"
                                    spacing={0.3}
                                    alignItems="center"
                                >
                                    <StarIcon
                                        sx={{ fontSize: 14, color: "#fbbf24" }}
                                    />
                                    <Box component="span">
                                        {formatStars(stars)}
                                    </Box>
                                </Stack>
                            </>
                        )}
                    </Box>

                    {me === undefined ? (
                        // Placeholder while we resolve the session — avoids flashing
                        // "Sign in" to an already-signed-in user.
                        <Box
                            sx={{
                                width: {
                                    xs: 80,
                                    "@media (min-width: 640px)": 104,
                                },
                                height: 38,
                            }}
                        />
                    ) : me ? (
                        <Button
                            component={Link}
                            href="/dashboard"
                            disableElevation
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                color: "#f4f4f6",
                                borderRadius: "10px",
                                pl: 0.6,
                                pr: {
                                    xs: 0.6,
                                    "@media (min-width: 640px)": 1.4,
                                },
                                py: 0.5,
                                gap: 0.9,
                                border: "1px solid rgba(255,255,255,0.1)",
                                "&:hover": {
                                    borderColor: "rgba(155,123,247,0.45)",
                                    background: "rgba(155,123,247,0.08)",
                                },
                            }}
                        >
                            <Avatar
                                src={me.avatar || undefined}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    fontSize: "0.9rem",
                                    bgcolor: "rgba(155,123,247,0.4)",
                                }}
                            >
                                {(me.name || me.email || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                            </Avatar>
                            <Box
                                sx={{
                                    display: {
                                        xs: "none",
                                        "@media (min-width: 640px)": {
                                            display: "flex",
                                        },
                                    },
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    minWidth: 0,
                                    lineHeight: 1.15,
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        fontSize: "0.86rem",
                                        fontWeight: 600,
                                        color: "#f4f4f6",
                                        maxWidth: 150,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {me.name || me.email}
                                </Box>
                                {me.name && me.email && (
                                    <Box
                                        component="span"
                                        sx={{
                                            fontSize: "0.7rem",
                                            fontWeight: 500,
                                            color: "rgba(244,244,246,0.5)",
                                            maxWidth: 150,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {me.email}
                                    </Box>
                                )}
                            </Box>
                        </Button>
                    ) : (
                        <Button
                            component={Link}
                            href="/login"
                            disableElevation
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                color: "#fff",
                                background:
                                    "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                borderRadius: "10px",
                                px: 2.2,
                                py: 0.8,
                                boxShadow: "0 4px 14px rgba(155,123,247,0.32)",
                                "&:hover": {
                                    background:
                                        "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)",
                                    boxShadow:
                                        "0 6px 20px rgba(155,123,247,0.45)",
                                },
                            }}
                        >
                            Sign in
                        </Button>
                    )}

                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="end"
                        onClick={handleDrawerToggle}
                        sx={{
                            display: {
                                xs: "inline-flex",
                                "@media (min-width: 640px)": {
                                    display: "none",
                                },
                            },
                            color: "rgba(244,244,246,0.8)",
                            ml: 0.5,
                            "&:hover": {
                                color: "#fff",
                                background: "rgba(255,255,255,0.08)",
                            },
                        }}
                    >
                        <MenuIcon />
                    </IconButton>
                </Stack>
            </Toolbar>

            <Drawer
                anchor="right"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                PaperProps={{
                    sx: {
                        width: 280,
                        background: "rgba(11, 13, 18, 0.96)",
                        backdropFilter: "blur(20px)",
                        borderLeft: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
                        color: "#f4f4f6",
                        p: 3,
                    },
                }}
            >
                <Stack spacing={3} sx={{ height: "100%" }}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                    >
                        <Link
                            href="/"
                            onClick={handleDrawerToggle}
                            style={{
                                textDecoration: "none",
                                color: "inherit",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                            }}
                        >
                            <Box
                                component="img"
                                src="/mark.png"
                                alt="Elixpo Pay"
                                sx={{
                                    height: 28,
                                    width: 28,
                                    borderRadius: "6px",
                                    display: "block",
                                }}
                            />
                            <Typography
                                sx={{
                                    fontWeight: 700,
                                    fontSize: "1.05rem",
                                    color: "#f4f4f6",
                                }}
                            >
                                Elixpo{" "}
                                <Box component="span" sx={{ color: ACCENT }}>
                                    Pay
                                </Box>
                            </Typography>
                        </Link>
                        <IconButton
                            onClick={handleDrawerToggle}
                            sx={{
                                color: "rgba(244,244,246,0.7)",
                                "&:hover": {
                                    color: "#fff",
                                    background: "rgba(255,255,255,0.08)",
                                },
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                    <Stack spacing={1} sx={{ flexGrow: 1 }}>
                        {LINKS.map((l) => (
                            <Button
                                key={l.label}
                                component={Link}
                                href={l.href}
                                onClick={handleDrawerToggle}
                                fullWidth
                                sx={{
                                    justifyContent: "flex-start",
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.95rem",
                                    color: "rgba(244,244,246,0.8)",
                                    py: 1.2,
                                    px: 2,
                                    borderRadius: "10px",
                                    transition: "all 0.2s ease",
                                    "&:hover": {
                                        color: "#fff",
                                        background: "rgba(155, 123, 247, 0.08)",
                                        borderLeft: `3px solid ${ACCENT}`,
                                        pl: 1.7, // compensate for border to avoid shifting text
                                    },
                                }}
                            >
                                {l.label}
                            </Button>
                        ))}
                    </Stack>

                    <Stack spacing={2} sx={{ mt: "auto" }}>
                        <Divider
                            sx={{ borderColor: "rgba(255,255,255,0.08)" }}
                        />
                        <Box
                            component="a"
                            href={REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleDrawerToggle}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: 42,
                                px: 2,
                                gap: 1,
                                borderRadius: "10px",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "rgba(244,244,246,0.9)",
                                textDecoration: "none",
                                fontSize: "0.9rem",
                                fontWeight: 700,
                                transition: "all 0.18s ease",
                                "&:hover": {
                                    color: "#fff",
                                    borderColor: "rgba(155,123,247,0.45)",
                                    background: "rgba(155,123,247,0.08)",
                                },
                            }}
                        >
                            <GitHubIcon sx={{ fontSize: 20 }} />
                            <span>GitHub</span>
                            {stars !== null && (
                                <>
                                    <Box
                                        sx={{
                                            width: "1px",
                                            height: 16,
                                            background:
                                                "rgba(255,255,255,0.15)",
                                        }}
                                    />
                                    <Stack
                                        direction="row"
                                        spacing={0.3}
                                        alignItems="center"
                                    >
                                        <StarIcon
                                            sx={{
                                                fontSize: 14,
                                                color: "#fbbf24",
                                            }}
                                        />
                                        <span>{formatStars(stars)}</span>
                                    </Stack>
                                </>
                            )}
                        </Box>
                    </Stack>
                </Stack>
            </Drawer>
        </AppBar>
    );
};

export default Navbar;
