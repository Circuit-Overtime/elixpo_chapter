"use client";

export const runtime = "edge";

import {
    Box,
    Button,
    CircularProgress,
    Divider,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    Toolbar,
    Typography,
} from "@mui/material";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import CodeIcon from "@mui/icons-material/Code";
import InventoryIcon from "@mui/icons-material/Inventory2";
import LogoutIcon from "@mui/icons-material/Logout";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import { ThemeProvider } from "@mui/material/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { dashboardTheme } from "@/components/dashboard-ui";
import BackgroundAurora from "../components/background-aurora";

const NAV = [
    { label: "Overview", icon: SpaceDashboardIcon, href: "/dashboard" },
    { label: "Products & Pricing", icon: InventoryIcon, href: "/dashboard/products" },
    { label: "Transactions", icon: ReceiptLongIcon, href: "/dashboard/transactions" },
    { label: "Developers", icon: CodeIcon, href: "/dashboard/developers" },
];

interface Me {
    name: string;
    email: string;
    avatar: string | null;
    merchant: { id: string; name: string };
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [me, setMe] = useState<Me | null>(null);
    const [checked, setChecked] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    useEffect(() => {
        fetch("/api/auth/me", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: any) => {
                if (!data) {
                    window.location.assign("/login");
                    return;
                }
                setMe(data);
                setChecked(true);
            })
            .catch(() => window.location.assign("/login"));
    }, []);

    const logout = async () => {
        setAnchorEl(null);
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {
            // silent
        }
        window.location.assign("/");
    };

    const isActive = (href: string) =>
        href === "/dashboard" ? pathname === href : pathname.startsWith(href);

    if (!checked) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#0b0d12",
                }}
            >
                <CircularProgress sx={{ color: "#9b7bf7" }} />
            </Box>
        );
    }

    const initial = (me?.name || me?.email || "M").charAt(0).toUpperCase();

    return (
        <ThemeProvider theme={dashboardTheme}>
            <Box sx={{ position: "relative", minHeight: "100vh", color: "#f5f5f4" }}>
                <BackgroundAurora variant="default" />
                <Box sx={{ position: "relative", zIndex: 1 }}>
                    <AppBar
                        position="sticky"
                        elevation={0}
                        sx={{
                            bgcolor: "rgba(11,13,18,0.55)",
                            backdropFilter: "blur(16px)",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <Toolbar
                            sx={{
                                maxWidth: "1280px",
                                width: "100%",
                                mx: "auto",
                                px: { xs: 2, md: 3 },
                                gap: 1,
                            }}
                        >
                            <Box
                                component={Link}
                                href="/dashboard"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.2,
                                    textDecoration: "none",
                                    mr: { xs: 1, md: 3 },
                                    flexShrink: 0,
                                }}
                            >
                                <Box
                                    sx={{
                                        height: 30,
                                        width: 30,
                                        borderRadius: "8px",
                                        display: "grid",
                                        placeItems: "center",
                                        fontWeight: 800,
                                        color: "#fff",
                                        background:
                                            "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                    }}
                                >
                                    ₹
                                </Box>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        color: "#f5f5f4",
                                        display: { xs: "none", sm: "block" },
                                        letterSpacing: "-0.01em",
                                    }}
                                >
                                    Elixpo Pay
                                </Typography>
                            </Box>

                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ flexGrow: 1, overflowX: "auto" }}
                            >
                                {NAV.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Button
                                            key={item.href}
                                            component={Link}
                                            href={item.href}
                                            startIcon={<item.icon sx={{ fontSize: "1.1rem !important" }} />}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 600,
                                                fontSize: "0.85rem",
                                                whiteSpace: "nowrap",
                                                px: 1.6,
                                                borderRadius: "10px",
                                                color: active ? "#c4b5fd" : "rgba(255,255,255,0.55)",
                                                bgcolor: active ? "rgba(155,123,247,0.12)" : "transparent",
                                                border: active
                                                    ? "1px solid rgba(155,123,247,0.3)"
                                                    : "1px solid transparent",
                                                "&:hover": {
                                                    bgcolor: "rgba(255,255,255,0.06)",
                                                    color: "#fff",
                                                },
                                            }}
                                        >
                                            <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                                                {item.label}
                                            </Box>
                                        </Button>
                                    );
                                })}
                            </Stack>

                            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "50%",
                                        display: "grid",
                                        placeItems: "center",
                                        fontWeight: 700,
                                        color: "#fff",
                                        background:
                                            "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                    }}
                                >
                                    {initial}
                                </Box>
                            </IconButton>

                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={() => setAnchorEl(null)}
                                transformOrigin={{ horizontal: "right", vertical: "top" }}
                                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                                slotProps={{
                                    paper: {
                                        sx: {
                                            mt: 1,
                                            bgcolor: "rgba(17,21,28,0.96)",
                                            backdropFilter: "blur(16px)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "12px",
                                            minWidth: 240,
                                        },
                                    },
                                }}
                            >
                                <Box sx={{ px: 2, py: 1.5 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                        {me?.merchant.name}
                                    </Typography>
                                    <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                                        {me?.email}
                                    </Typography>
                                </Box>
                                <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                                <MenuItem
                                    onClick={logout}
                                    sx={{
                                        py: 1.25,
                                        color: "rgba(255,255,255,0.6)",
                                        "&:hover": { bgcolor: "rgba(239,68,68,0.08)", color: "#ef4444" },
                                    }}
                                >
                                    <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                                        <LogoutIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primaryTypographyProps={{ fontSize: "0.875rem" }}>
                                        Sign out
                                    </ListItemText>
                                </MenuItem>
                            </Menu>
                        </Toolbar>
                    </AppBar>

                    <Box
                        component="main"
                        sx={{ maxWidth: "1280px", mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}
                    >
                        {children}
                    </Box>
                </Box>
            </Box>
        </ThemeProvider>
    );
}
