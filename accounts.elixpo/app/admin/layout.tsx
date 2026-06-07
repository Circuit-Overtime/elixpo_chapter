"use client";

import {
    Apps,
    GitHub,
    History,
    Key,
    Logout,
    People,
    Person,
    Settings,
    Speed,
} from "@mui/icons-material";
import {
    AppBar,
    Box,
    CircularProgress,
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { AdminProvider, useAdminSession } from "../../src/lib/admin-context";
import BackgroundAurora from "../components/background-aurora";

export const runtime = "edge";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#9b7bf7" },
        background: {
            default: "transparent",
            paper: "rgba(255, 255, 255, 0.03)",
        },
    },
    typography: {
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "16px",
                    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "16px",
                },
            },
        },
    },
});

const navItems = [
    { label: "Dashboard", icon: Speed, href: "/admin" },
    { label: "Users", icon: People, href: "/admin/users" },
    { label: "Apps", icon: Apps, href: "/admin/apps" },
    { label: "API Keys", icon: Key, href: "/admin/api-keys" },
    { label: "Logs", icon: History, href: "/admin/logs" },
    { label: "Settings", icon: Settings, href: "/admin/settings" },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const _router = useRouter();
    const { session, loading, logout } = useAdminSession();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const isLoginPage = pathname === "/admin/login";

    const isActive = (href: string) => {
        if (href === "/admin") {
            return pathname === "/admin";
        }
        return pathname.startsWith(href);
    };

    if (loading) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress sx={{ color: "#9b7bf7" }} />
            </Box>
        );
    }

    if (isLoginPage) {
        return (
            <Box sx={{ position: "relative", minHeight: "100vh" }}>
                <BackgroundAurora variant="warm" />
                <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
            </Box>
        );
    }

    return (
        <Box sx={{ position: "relative", minHeight: "100vh" }}>
            <BackgroundAurora variant="warm" />
            <Box sx={{ position: "relative", zIndex: 1 }}>
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        bgcolor: "rgba(11, 13, 18, 0.4)",
                        backdropFilter: "blur(16px)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                >
                    <Toolbar
                        sx={{
                            maxWidth: "1400px",
                            width: "100%",
                            mx: "auto",
                            px: { xs: 2, md: 3 },
                        }}
                    >
                        <Box
                            component={Link}
                            href="/admin"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                textDecoration: "none",
                                mr: 4,
                                flexShrink: 0,
                            }}
                        >
                            <Box
                                component="img"
                                src="/LOGO/logo.png"
                                alt="Elixpo"
                                sx={{
                                    height: 32,
                                    width: 32,
                                    borderRadius: "8px",
                                }}
                            />
                            <Typography
                                sx={{
                                    fontWeight: 700,
                                    fontSize: "1.1rem",
                                    color: "#f5f5f4",
                                    display: { xs: "none", sm: "block" },
                                    letterSpacing: "-0.01em",
                                }}
                            >
                                Elixpo Admin
                            </Typography>
                        </Box>

                        <Box sx={{ flexGrow: 1 }} />

                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mr: 1,
                            }}
                        >
                            {navItems.map((item) => (
                                <IconButton
                                    key={item.href}
                                    component={Link}
                                    href={item.href}
                                    title={item.label}
                                    sx={{
                                        color: isActive(item.href)
                                            ? "#9b7bf7"
                                            : "rgba(255, 255, 255, 0.45)",
                                        bgcolor: isActive(item.href)
                                            ? "rgba(155, 123, 247, 0.1)"
                                            : "transparent",
                                        borderRadius: "8px",
                                        width: 38,
                                        height: 38,
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                            bgcolor: isActive(item.href)
                                                ? "rgba(155, 123, 247, 0.15)"
                                                : "rgba(255, 255, 255, 0.06)",
                                            color: isActive(item.href)
                                                ? "#9b7bf7"
                                                : "rgba(255, 255, 255, 0.8)",
                                        },
                                    }}
                                >
                                    <item.icon sx={{ fontSize: "1.25rem" }} />
                                </IconButton>
                            ))}
                        </Box>

                        <IconButton
                            component="a"
                            href="https://github.com/elixpo/elixpoaccounts"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="GitHub"
                            sx={{
                                color: "rgba(255,255,255,0.35)",
                                width: 38,
                                height: 38,
                                borderRadius: "8px",
                                mr: 1,
                                "&:hover": {
                                    color: "#fff",
                                    bgcolor: "rgba(255,255,255,0.06)",
                                },
                            }}
                        >
                            <GitHub sx={{ fontSize: "1.2rem" }} />
                        </IconButton>

                        <IconButton
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                            sx={{ p: 0.5 }}
                        >
                            <Box
                                sx={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    background:
                                        "linear-gradient(135deg, #ff8a5b 0%, #9b7bf7 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.95rem",
                                    fontWeight: 700,
                                    color: "#161816",
                                }}
                            >
                                {session?.email?.charAt(0).toUpperCase() || "A"}
                            </Box>
                        </IconButton>

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            transformOrigin={{
                                horizontal: "right",
                                vertical: "top",
                            }}
                            anchorOrigin={{
                                horizontal: "right",
                                vertical: "bottom",
                            }}
                            slotProps={{
                                paper: {
                                    sx: {
                                        mt: 1,
                                        bgcolor: "rgba(20, 24, 18, 0.95)",
                                        backdropFilter: "blur(16px)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        borderRadius: "12px",
                                        minWidth: 220,
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                                    },
                                },
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.5 }}>
                                <Typography
                                    sx={{
                                        color: "#f5f5f4",
                                        fontWeight: 600,
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    Admin User
                                </Typography>
                                <Typography
                                    sx={{
                                        color: "rgba(255,255,255,0.4)",
                                        fontSize: "0.8rem",
                                    }}
                                >
                                    {session?.email}
                                </Typography>
                            </Box>
                            <Divider
                                sx={{ borderColor: "rgba(255,255,255,0.08)" }}
                            />
                            <MenuItem
                                component={Link}
                                href="/dashboard/profile"
                                onClick={() => setAnchorEl(null)}
                                sx={{
                                    py: 1.25,
                                    color: "rgba(255,255,255,0.7)",
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.05)",
                                        color: "#f5f5f4",
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{ color: "inherit", minWidth: 36 }}
                                >
                                    <Person fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                    primaryTypographyProps={{
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    User Profile
                                </ListItemText>
                            </MenuItem>
                            <Divider
                                sx={{ borderColor: "rgba(255,255,255,0.08)" }}
                            />
                            <MenuItem
                                onClick={logout}
                                sx={{
                                    py: 1.25,
                                    color: "rgba(255,255,255,0.5)",
                                    "&:hover": {
                                        bgcolor: "rgba(239, 68, 68, 0.08)",
                                        color: "#ef4444",
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{ color: "inherit", minWidth: 36 }}
                                >
                                    <Logout fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                    primaryTypographyProps={{
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    Logout
                                </ListItemText>
                            </MenuItem>
                        </Menu>
                    </Toolbar>
                </AppBar>

                <Box
                    component="main"
                    sx={{
                        maxWidth: "1400px",
                        mx: "auto",
                        px: { xs: 2, md: 3 },
                        py: 3,
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminProvider>
            <ThemeProvider theme={darkTheme}>
                <AdminLayoutContent>{children}</AdminLayoutContent>
            </ThemeProvider>
        </AdminProvider>
    );
}
