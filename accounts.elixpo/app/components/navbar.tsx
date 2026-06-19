"use client";

import {
    Apps,
    DevicesOther,
    Person,
    SpaceDashboard,
    Webhook,
} from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import GitHubIcon from "@mui/icons-material/GitHub";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuIcon from "@mui/icons-material/Menu";
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Chip,
    Drawer,
    IconButton,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, useEffect, useState } from "react";

const ACCENT = "#9b7bf7";
const REPO_URL = "https://github.com/elixpo/accounts.elixpo";

interface Me {
    email: string;
    displayName: string | null;
    avatar: string | null;
}

// Marketing nav (signed-out).
const MARKETING_LINKS = [
    { label: "Home", href: "/" },
    { label: "Docs", href: "/docs" },
    { label: "About", href: "/about" },
];

// App nav (signed-in) — the dashboard sections that make sense up top.
const APP_LINKS: { label: string; href: string; icon: ComponentType<{ sx?: object }> }[] = [
    { label: "Dashboard", href: "/dashboard", icon: SpaceDashboard },
    { label: "OAuth Apps", href: "/dashboard/oauth-apps", icon: Apps },
    { label: "Services", href: "/dashboard/services", icon: DevicesOther },
    { label: "Webhooks", href: "/dashboard/webhooks", icon: Webhook },
    { label: "Profile", href: "/dashboard/profile", icon: Person },
];

function AppNavLinks({
    orientation,
    onNavigate,
}: {
    orientation: "horizontal" | "vertical";
    onNavigate?: () => void;
}) {
    const pathname = usePathname();
    const horizontal = orientation === "horizontal";
    // Exact match for /dashboard so it isn't "active" on every sub-route.
    const isActive = (href: string) =>
        href === "/dashboard" ? pathname === href : pathname.startsWith(href);

    return (
        <Stack
            direction={horizontal ? "row" : "column"}
            spacing={horizontal ? 0.5 : 0.5}
            sx={{ width: horizontal ? "auto" : "100%" }}
        >
            {APP_LINKS.map((l) => {
                const active = isActive(l.href);
                const Icon = l.icon;
                return (
                    <Button
                        key={l.href}
                        component={Link}
                        href={l.href}
                        onClick={onNavigate}
                        startIcon={<Icon sx={{ fontSize: 18 }} />}
                        sx={{
                            justifyContent: horizontal ? "center" : "flex-start",
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: horizontal ? "0.88rem" : "0.95rem",
                            color: active ? "#fff" : "rgba(244,244,246,0.7)",
                            px: horizontal ? 1.4 : 1.5,
                            py: horizontal ? 0.6 : 1.1,
                            borderRadius: "9px",
                            background: active ? "rgba(155,123,247,0.12)" : "transparent",
                            "& .MuiButton-startIcon": {
                                color: active ? ACCENT : "rgba(244,244,246,0.55)",
                            },
                            "&:hover": {
                                color: "#fff",
                                background: active
                                    ? "rgba(155,123,247,0.18)"
                                    : "rgba(255,255,255,0.05)",
                            },
                        }}
                    >
                        {l.label}
                    </Button>
                );
            })}
        </Stack>
    );
}

const Navbar = () => {
    // undefined = checking, null = signed out, Me = signed in
    const [me, setMe] = useState<Me | null | undefined>(undefined);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/me", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: any) => {
                if (cancelled) return;
                setMe(
                    d && d.email
                        ? { email: d.email, displayName: d.displayName ?? null, avatar: d.avatar ?? null }
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

    return (
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
                        src="/LOGO/logo.png"
                        alt="Elixpo Accounts"
                        sx={{ height: 30, width: 30, borderRadius: "9px", display: "block" }}
                    />
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: "1.15rem",
                            color: "#f4f4f6",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Elixpo
                        <Box component="span" sx={{ color: ACCENT }}>
                            {" "}
                            Accounts
                        </Box>
                    </Typography>
                    {!me && (
                        <Chip
                            label="SSO"
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
                    )}
                </Link>

                <Box sx={{ flexGrow: 1, justifyContent: "center", display: { xs: "none", md: "flex" } }}>
                    {me === undefined ? null : me ? (
                        <AppNavLinks orientation="horizontal" />
                    ) : (
                        <Stack direction="row" spacing={0.5}>
                            {MARKETING_LINKS.map((l) => (
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
                    )}
                </Box>

                <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

                <Stack direction="row" spacing={{ xs: 1, md: 1.2 }} alignItems="center">
                    {/* GitHub — marketing nav only (hidden once signed in) */}
                    {!me && (
                        <Tooltip title="View source on GitHub" arrow>
                            <IconButton
                                component="a"
                                href={REPO_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="View source on GitHub"
                                sx={{
                                    display: { xs: "none", sm: "inline-flex" },
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
                    )}

                    {me === undefined ? (
                        // Placeholder while resolving the session — avoids flashing
                        // "Sign in" to an already-signed-in user.
                        <Box sx={{ width: 104, height: 38 }} />
                    ) : me ? (
                        // Signed in: profile chip → /dashboard (logout lives in the dashboard).
                        <Box
                            component={Link}
                            href="/dashboard"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                textDecoration: "none",
                                color: "inherit",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "10px",
                                pl: 0.6,
                                pr: { xs: 0.6, sm: 1 },
                                py: 0.5,
                                transition: "all 0.15s ease",
                                "&:hover": { borderColor: "rgba(155,123,247,0.4)", background: "rgba(155,123,247,0.06)" },
                            }}
                        >
                            <Avatar
                                src={me.avatar || undefined}
                                sx={{ width: 28, height: 28, fontSize: "0.85rem", bgcolor: "rgba(155,123,247,0.4)" }}
                            >
                                {(me.displayName || me.email || "?").charAt(0).toUpperCase()}
                            </Avatar>
                            <Stack sx={{ display: { xs: "none", sm: "flex" }, alignItems: "flex-start", lineHeight: 1.1 }}>
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#f5f5f4", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {me.displayName || me.email}
                                </Typography>
                                <Typography sx={{ fontSize: "0.7rem", color: "rgba(245,245,244,0.45)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {me.email}
                                </Typography>
                            </Stack>
                            <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "rgba(245,245,244,0.5)", display: { xs: "none", sm: "block" } }} />
                        </Box>
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
                    )}

                    {/* Mobile hamburger */}
                    <IconButton
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Open menu"
                        sx={{ display: { xs: "inline-flex", md: "none" }, color: "rgba(244,244,246,0.85)" }}
                    >
                        <MenuIcon />
                    </IconButton>
                </Stack>
            </Toolbar>

            {/* Mobile nav drawer */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sx={{ display: { md: "none" } }}
                PaperProps={{
                    sx: {
                        width: 282,
                        background: "#0d1016",
                        borderLeft: "1px solid rgba(255,255,255,0.08)",
                        color: "#f5f5f4",
                        p: 2,
                    },
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 0.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1.1}>
                        <Box component="img" src="/LOGO/logo.png" alt="Elixpo Accounts" sx={{ height: 26, width: 26, borderRadius: "7px" }} />
                        <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
                            Elixpo
                            <Box component="span" sx={{ color: ACCENT }}>
                                {" "}
                                Accounts
                            </Box>
                        </Typography>
                    </Stack>
                    <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close menu" sx={{ color: "rgba(245,245,244,0.6)" }}>
                        <CloseIcon />
                    </IconButton>
                </Stack>

                {me ? (
                    // Signed in: the app routes (logout lives in the dashboard).
                    <AppNavLinks orientation="vertical" onNavigate={() => setDrawerOpen(false)} />
                ) : (
                    <Stack spacing={0.5}>
                        {MARKETING_LINKS.map((l) => (
                            <Button
                                key={l.label}
                                component={Link}
                                href={l.href}
                                onClick={() => setDrawerOpen(false)}
                                sx={{
                                    justifyContent: "flex-start",
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.95rem",
                                    color: "rgba(244,244,246,0.8)",
                                    px: 1.5,
                                    py: 1.1,
                                    borderRadius: "10px",
                                    "&:hover": { color: "#fff", background: "rgba(255,255,255,0.05)" },
                                }}
                            >
                                {l.label}
                            </Button>
                        ))}
                        <Button
                            component={Link}
                            href="/login"
                            onClick={() => setDrawerOpen(false)}
                            sx={{
                                mt: 1,
                                textTransform: "none",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                color: "#fff",
                                background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                borderRadius: "10px",
                                py: 1.1,
                                boxShadow: "0 4px 14px rgba(155,123,247,0.32)",
                                "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
                            }}
                        >
                            Sign in
                        </Button>
                    </Stack>
                )}
            </Drawer>
        </AppBar>
    );
};

export default Navbar;
