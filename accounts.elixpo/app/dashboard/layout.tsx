"use client";

import {
    Apps,
    DevicesOther,
    GitHub,
    Logout,
    MenuBook,
    Person,
    Security,
    Webhook,
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
import { useEffect, useState } from "react";

import BackgroundAurora from "../components/background-aurora";

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

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { label: "OAuth Apps", icon: Apps, href: "/dashboard/oauth-apps" },
    { label: "Services", icon: DevicesOther, href: "/dashboard/services" },
    { label: "Profile", icon: Person, href: "/dashboard/profile" },
    { label: "Webhooks", icon: Webhook, href: "/dashboard/webhooks" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string>("");
    const [displayName, setDisplayName] = useState<string>("");
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Auth check. Uses window.location for redirects so router isn't
    // referenced inside the effect body — that way eslint-react-hooks can't
    // autofix `router` into the deps array (which loops because useRouter
    // returns a new ref on every render under Next 15.2 + React 19).
    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then((res) => {
                if (res.ok) return res.json();
                window.location.assign("/login");
                return null;
            })
            .then((data: any) => {
                if (!data) return;
                if (!data.username) {
                    window.location.replace("/setup-name");
                    return;
                }
                // 2FA hard wall: users with ≥3 OAuth apps must have MFA
                // enabled to keep using the dashboard. `mfa_setup_required`
                // is set server-side in /api/auth/me. /dashboard/security
                // is the ONE page allowed past the wall — that's where
                // they enroll a factor and flip the flag. Without this
                // exception we'd infinite-loop the redirect.
                if (
                    data.mfa_setup_required &&
                    pathname !== "/dashboard/security"
                ) {
                    window.location.replace("/mfa/setup-required");
                    return;
                }
                if (data.email) setUserEmail(data.email);
                if (data.displayName) setDisplayName(data.displayName);
                if (data.avatar) setUserAvatar(data.avatar);
                setAuthChecked(true);
            })
            .catch(() => {
                window.location.assign("/login");
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const handleLogout = async () => {
        setAnchorEl(null);
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // silent
        }
        router.push("/");
    };

    const isActive = (href: string) => pathname.startsWith(href);

    if (!authChecked) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#0f1117",
                }}
            >
                <CircularProgress sx={{ color: "#9b7bf7" }} />
            </Box>
        );
    }

    return (
        <ThemeProvider theme={darkTheme}>
            <Box sx={{ position: "relative", minHeight: "100vh" }}>
                <BackgroundAurora variant="default" />
                <Box sx={{ position: "relative", zIndex: 1 }}>
                    {/* Top Navbar */}
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
                            {/* Logo + Brand */}
                            <Box
                                component={Link}
                                href="/dashboard/oauth-apps"
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
                                    Elixpo Accounts
                                </Typography>
                            </Box>
                            {/* Spacer */}

                            <Box sx={{ flexGrow: 1 }} />
                            {/* Nav Icons (right side) */}

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
                                        <item.icon
                                            sx={{ fontSize: "1.25rem" }}
                                        />
                                    </IconButton>
                                ))}
                            </Box>
                            {/* GitHub */}

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
                                    "&:hover": {
                                        color: "#fff",
                                        bgcolor: "rgba(255,255,255,0.06)",
                                    },
                                }}
                            >
                                <GitHub sx={{ fontSize: "1.2rem" }} />
                            </IconButton>
                            {/* User Avatar / Menu */}

                            <IconButton
                                onClick={(e) => setAnchorEl(e.currentTarget)}
                                sx={{ p: 0.5 }}
                            >
                                {userAvatar ? (
                                    <Box
                                        component="img"
                                        src={userAvatar}
                                        alt="Avatar"
                                        sx={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: "50%",
                                            border: "2px solid rgba(155, 123, 247, 0.3)",
                                        }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: "50%",
                                            background:
                                                "linear-gradient(135deg, #9b7bf7 0%, #65a30d 100%)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "0.95rem",
                                            fontWeight: 700,
                                            color: "#161816",
                                        }}
                                    >
                                        {(displayName || userEmail)
                                            ?.charAt(0)
                                            .toUpperCase() || "E"}
                                    </Box>
                                )}
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
                                            boxShadow:
                                                "0 8px 32px rgba(0,0,0,0.4)",
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
                                        {displayName || "User"}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: "rgba(255,255,255,0.4)",
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        {userEmail}
                                    </Typography>
                                </Box>
                                <Divider
                                    sx={{
                                        borderColor: "rgba(255,255,255,0.08)",
                                    }}
                                />
                                {/* Account group */}
                                {[
                                    {
                                        href: "/dashboard/profile",
                                        icon: <Person fontSize="small" />,
                                        label: "Profile",
                                    },
                                    {
                                        href: "/dashboard/security",
                                        icon: <Security fontSize="small" />,
                                        label: "Security & 2FA",
                                    },
                                    {
                                        href: "/dashboard/services",
                                        icon: <DevicesOther fontSize="small" />,
                                        label: "Connected services",
                                    },
                                ].map((item) => (
                                    <MenuItem
                                        key={item.href}
                                        component={Link}
                                        href={item.href}
                                        onClick={() => setAnchorEl(null)}
                                        sx={{
                                            py: 1.25,
                                            color: "rgba(255,255,255,0.7)",
                                            "&:hover": {
                                                bgcolor:
                                                    "rgba(255,255,255,0.05)",
                                                color: "#f5f5f4",
                                            },
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                color: "inherit",
                                                minWidth: 36,
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primaryTypographyProps={{
                                                fontSize: "0.875rem",
                                            }}
                                        >
                                            {item.label}
                                        </ListItemText>
                                    </MenuItem>
                                ))}

                                <Divider
                                    sx={{
                                        borderColor: "rgba(255,255,255,0.08)",
                                    }}
                                />

                                {/* Developer group — opens in same tab for
                                    internal pages, new tab for the external
                                    docs link. */}
                                {[
                                    {
                                        href: "/dashboard/oauth-apps",
                                        icon: <Apps fontSize="small" />,
                                        label: "OAuth apps",
                                        external: false,
                                    },
                                    {
                                        href: "/dashboard/webhooks",
                                        icon: <Webhook fontSize="small" />,
                                        label: "Webhooks",
                                        external: false,
                                    },
                                    {
                                        href: "/docs",
                                        icon: <MenuBook fontSize="small" />,
                                        label: "API docs",
                                        external: false,
                                    },
                                ].map((item) => (
                                    <MenuItem
                                        key={item.href}
                                        component={Link}
                                        href={item.href}
                                        onClick={() => setAnchorEl(null)}
                                        sx={{
                                            py: 1.25,
                                            color: "rgba(255,255,255,0.7)",
                                            "&:hover": {
                                                bgcolor:
                                                    "rgba(255,255,255,0.05)",
                                                color: "#f5f5f4",
                                            },
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                color: "inherit",
                                                minWidth: 36,
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primaryTypographyProps={{
                                                fontSize: "0.875rem",
                                            }}
                                        >
                                            {item.label}
                                        </ListItemText>
                                    </MenuItem>
                                ))}

                                <Divider
                                    sx={{
                                        borderColor: "rgba(255,255,255,0.08)",
                                    }}
                                />

                                <MenuItem
                                    onClick={handleLogout}
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
                                        Sign out
                                    </ListItemText>
                                </MenuItem>
                            </Menu>
                        </Toolbar>
                    </AppBar>
                    {/* Page Content */}

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
        </ThemeProvider>
    );
}
