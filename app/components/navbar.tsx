"use client";

import CloseIcon from "@mui/icons-material/Close";
import GitHubIcon from "@mui/icons-material/GitHub";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import {
    Avatar,
    Box,
    Button,
    Drawer,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import gsap from "gsap";

interface Me {
    name: string;
    email: string;
    avatar: string | null;
}

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
    const pathname = usePathname();
    const [stars, setStars] = useState<number | null>(null);
    const [me, setMe] = useState<Me | null | undefined>(undefined);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    // GSAP Intro slide down animation
    useEffect(() => {
        gsap.fromTo(".nav-pill-container",
            { y: -100, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: "power4.out", delay: 0.15 }
        );
    }, []);

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
            position="fixed"
            elevation={0}
            sx={{
                background: "transparent",
                zIndex: 1000,
                pt: { xs: 1.5, md: 3 }, // floats below the viewport top
                left: 0,
                right: 0,
            }}
        >
            <Toolbar
                disableGutters
                sx={{
                    justifyContent: "center",
                    width: "100%",
                    px: 2,
                }}
            >
                {/* Floating Nav Pill Container */}
                <Box
                    className="nav-pill-container"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        maxWidth: "1280px",
                        background: "rgba(255, 255, 255, 0.9)",
                        backdropFilter: "blur(24px)",
                        borderRadius: "999px",
                        px: { xs: 2.5, md: 4 },
                        py: 1,
                        boxShadow: "rgba(0, 0, 0, 0.04) 0px 4px 24px 0px",
                        border: "1px solid rgba(20, 20, 19, 0.06)",
                        opacity: 0, // Controlled by GSAP anim
                    }}
                >
                    {/* Logo Image from public folder */}
                    <Link
                        href="/"
                        style={{
                            textDecoration: "none",
                            color: "inherit",
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <Box
                            component="img"
                            src="/logo.png"
                            alt="Elixpo Pay"
                            sx={{
                                height: { xs: 24, md: 28 },
                                width: "auto",
                                display: "block",
                            }}
                        />
                    </Link>

                    {/* Central Link Group (Desktop) */}
                    <Stack
                        direction="row"
                        spacing={0}
                        sx={{
                            display: { xs: "none", lg: "flex" },
                            gap: "48px",
                            ml: 4,
                        }}
                    >
                        {LINKS.map((l) => {
                            const active = pathname === l.href;
                            return (
                                <Link
                                    key={l.label}
                                    href={l.href}
                                    style={{
                                        textDecoration: "none",
                                        fontWeight: active ? 600 : 500,
                                        fontSize: "16px",
                                        color: "#141413",
                                        letterSpacing: "-0.48px",
                                        fontFamily: "var(--font-sofia-sans)",
                                        padding: "8px 12px",
                                        borderRadius: "999px",
                                        background: active ? "rgba(20, 20, 19, 0.05)" : "transparent",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {l.label}
                                </Link>
                            );
                        })}
                    </Stack>

                    {/* Right side controls: Search, GitHub, Sign In, Hamburguer */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        {/* Slide-out Search Input (Desktop/Tablet) */}
                        <Box sx={{ display: { xs: "none", sm: "block" } }}>
                            {searchExpanded ? (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        background: "#FFFFFF",
                                        border: "1.5px solid #141413",
                                        borderRadius: "999px",
                                        px: 2,
                                        py: 0.5,
                                        width: 220,
                                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                                    }}
                                >
                                    <input
                                        autoFocus
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onBlur={() => {
                                            if (!searchQuery) setSearchExpanded(false);
                                        }}
                                        style={{
                                            border: "none",
                                            outline: "none",
                                            background: "transparent",
                                            color: "#141413",
                                            fontSize: "14px",
                                            width: "100%",
                                            fontFamily: "var(--font-sofia-sans)",
                                        }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSearchExpanded(false);
                                        }}
                                        sx={{ p: 0, color: "#141413" }}
                                    >
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Box>
                            ) : (
                                <IconButton
                                    onClick={() => setSearchExpanded(true)}
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: "50%",
                                        border: "1.5px solid rgba(20, 20, 19, 0.15)",
                                        color: "#141413",
                                        "&:hover": {
                                            background: "rgba(20, 20, 19, 0.05)",
                                            borderColor: "#141413",
                                        },
                                    }}
                                >
                                    <SearchIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                            )}
                        </Box>

                        {/* GitHub Stars (Desktop only) */}
                        <Box
                            component="a"
                            href={REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub repository"
                            sx={{
                                display: { xs: "none", md: "inline-flex" },
                                alignItems: "center",
                                height: 44,
                                px: 2,
                                gap: 1,
                                borderRadius: "20px",
                                border: "1.5px solid rgba(20, 20, 19, 0.15)",
                                color: "#141413",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                                fontFamily: "var(--font-sofia-sans)",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    background: "rgba(20, 20, 19, 0.05)",
                                    borderColor: "#141413",
                                },
                            }}
                        >
                            <GitHubIcon sx={{ fontSize: 18 }} />
                            {stars !== null && (
                                <>
                                    <Box
                                        sx={{
                                            width: "1px",
                                            height: 14,
                                            background: "rgba(20, 20, 19, 0.15)",
                                        }}
                                    />
                                    <Stack direction="row" spacing={0.3} alignItems="center">
                                        <StarIcon sx={{ fontSize: 13, color: "#CF4500" }} />
                                        <span>{formatStars(stars)}</span>
                                    </Stack>
                                </>
                            )}
                        </Box>

                        {/* Authentication Button: Ink Pill */}
                        {me === undefined ? (
                            <Box sx={{ width: 104, height: 44 }} />
                        ) : me ? (
                            <Button
                                component={Link}
                                href="/dashboard"
                                disableElevation
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 500,
                                    fontSize: "14px",
                                    color: "#141413",
                                    borderRadius: "20px",
                                    pl: 0.6,
                                    pr: 2,
                                    py: 0.5,
                                    gap: 1,
                                    border: "1.5px solid rgba(20, 20, 19, 0.15)",
                                    fontFamily: "var(--font-sofia-sans)",
                                    "&:hover": {
                                        background: "rgba(20, 20, 19, 0.05)",
                                        borderColor: "#141413",
                                    },
                                    "&:active": {
                                        transform: "scale(0.98)",
                                    },
                                }}
                            >
                                <Avatar
                                    src={me.avatar || undefined}
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        fontSize: "0.85rem",
                                        bgcolor: "#CF4500",
                                        color: "#FFFFFF",
                                    }}
                                >
                                    {(me.name || me.email || "?").charAt(0).toUpperCase()}
                                </Avatar>
                                <Box
                                    component="span"
                                    sx={{
                                        maxWidth: 100,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Dashboard
                                </Box>
                            </Button>
                        ) : (
                            <Button
                                component={Link}
                                href="/login"
                                disableElevation
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 500,
                                    fontSize: "16px",
                                    color: "#F3F0EE", // Canvas Cream text
                                    background: "#141413", // Ink Black background
                                    borderRadius: "20px",
                                    px: 3,
                                    py: 0.8,
                                    border: "1.5px solid #141413",
                                    fontFamily: "var(--font-sofia-sans)",
                                    letterSpacing: "-0.32px",
                                    "&:hover": {
                                        background: "#262627",
                                        borderColor: "#262627",
                                    },
                                    "&:active": {
                                        transform: "scale(0.97)",
                                    },
                                }}
                            >
                                Sign in
                            </Button>
                        )}

                        {/* Hamburger Button (Mobile / Tablet) */}
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="end"
                            onClick={handleDrawerToggle}
                            sx={{
                                display: { xs: "inline-flex", lg: "none" },
                                color: "#141413",
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                border: "1.5px solid rgba(20, 20, 19, 0.15)",
                                "&:hover": {
                                    background: "rgba(20, 20, 19, 0.05)",
                                },
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                    </Stack>
                </Box>
            </Toolbar>

            {/* Mobile Drawer (Warm Black background) */}
            <Drawer
                anchor="right"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true,
                }}
                PaperProps={{
                    sx: {
                        width: 280,
                        background: "#141413", // Ink Black
                        color: "#F3F0EE",
                        p: 3,
                        boxShadow: "-10px 0 40px rgba(0,0,0,0.3)",
                    },
                }}
            >
                <Stack spacing={3} sx={{ height: "100%" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Link
                            href="/"
                            onClick={handleDrawerToggle}
                            style={{
                                textDecoration: "none",
                                color: "inherit",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Box
                                component="img"
                                src="/logo.png"
                                alt="Elixpo Pay"
                                sx={{
                                    height: 24,
                                    width: "auto",
                                    display: "block",
                                    filter: "brightness(0) invert(1)", // Invert colors to render logo as pure white
                                }}
                            />
                        </Link>
                        <IconButton
                            onClick={handleDrawerToggle}
                            sx={{
                                color: "#F3F0EE",
                                "&:hover": {
                                    background: "rgba(255,255,255,0.08)",
                                },
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>

                    <Box sx={{ width: "100%", height: "1px", background: "rgba(243,240,238,0.1)" }} />

                    <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
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
                                    fontWeight: 500,
                                    fontSize: "18px",
                                    color: "#F3F0EE",
                                    py: 1,
                                    px: 2,
                                    borderRadius: "12px",
                                    fontFamily: "var(--font-sofia-sans)",
                                    transition: "all 0.2s ease",
                                    "&:hover": {
                                        background: "rgba(243,240,238,0.08)",
                                    },
                                }}
                            >
                                {l.label}
                            </Button>
                        ))}
                    </Stack>

                    <Stack spacing={2} sx={{ mt: "auto" }}>
                        <Box sx={{ width: "100%", height: "1px", background: "rgba(243,240,238,0.1)" }} />
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
                                height: 44,
                                borderRadius: "20px",
                                border: "1.5px solid rgba(243,240,238,0.3)",
                                color: "#F3F0EE",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                                fontFamily: "var(--font-sofia-sans)",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    background: "rgba(243,240,238,0.08)",
                                    borderColor: "#F3F0EE",
                                },
                            }}
                        >
                            <GitHubIcon sx={{ fontSize: 18, mr: 1 }} />
                            <span>GitHub</span>
                            {stars !== null && (
                                <>
                                    <Box
                                        sx={{
                                            width: "1px",
                                            height: 12,
                                            background: "rgba(243,240,238,0.3)",
                                            mx: 1,
                                        }}
                                    />
                                    <Stack direction="row" spacing={0.3} alignItems="center">
                                        <StarIcon sx={{ fontSize: 13, color: "#F37338" }} />
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
