"use client";

import CloseIcon from "@mui/icons-material/Close";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LogoutIcon from "@mui/icons-material/Logout";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import MenuIcon from "@mui/icons-material/Menu";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import {
    Avatar,
    Box,
    Chip,
    Divider,
    Drawer,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Typography,
} from "@mui/material";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { DashboardNavLinks } from "./dashboard-nav";

const BORDER = "rgba(255,255,255,0.07)";
const ACCENT = "#9b7bf7";

const MENU_ITEM_SX = {
    fontSize: "0.86rem",
    py: 1.0,
    gap: 1.3,
    color: "#f5f5f4",
    "&:hover": { background: "rgba(255,255,255,0.04)" },
} as const;
const MENU_ICON_SX = { fontSize: 18, color: "rgba(245,245,244,0.55)" } as const;

export interface DashboardUser {
    name: string;
    email: string;
    avatar: string | null;
    tenantId: string;
}

function initials(user: DashboardUser): string {
    return (user.name || user.email || "?").charAt(0).toUpperCase();
}

function Brand() {
    return (
        <Box
            component={Link}
            href="/dashboard"
            sx={{ display: "flex", alignItems: "center", gap: 1.1, textDecoration: "none", color: "inherit" }}
        >
            <Box
                component="img"
                src="/mark.png"
                alt="mail.elixpo"
                sx={{ height: 28, width: 28, borderRadius: "8px", display: "block" }}
            />
            <Typography sx={{ fontWeight: 700, fontSize: "1.02rem", color: "#f5f5f4", letterSpacing: "-0.01em", display: { xs: "none", sm: "block" } }}>
                Elixpo
                <Box component="span" sx={{ color: ACCENT }}>
                    {" "}
                    Mails
                </Box>
            </Typography>
        </Box>
    );
}

export default function DashboardTopbar({ user }: { user: DashboardUser }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);

    return (
        <>
            <Box
                component="header"
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1050,
                    height: 60,
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, md: 2 },
                    px: { xs: 2, md: 3 },
                    borderBottom: `1px solid ${BORDER}`,
                    background: "rgba(11,13,18,0.72)",
                    backdropFilter: "blur(20px)",
                }}
            >
                <IconButton
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open menu"
                    sx={{ display: { xs: "inline-flex", md: "none" }, color: "rgba(245,245,244,0.8)" }}
                >
                    <MenuIcon />
                </IconButton>

                <Brand />

                {/* Horizontal nav (desktop) */}
                <Box sx={{ display: { xs: "none", md: "flex" }, ml: 1.5 }}>
                    <DashboardNavLinks orientation="horizontal" />
                </Box>

                <Box sx={{ flexGrow: 1 }} />

                {/* Profile menu */}
                <Box
                    component="button"
                    onClick={(e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
                    aria-haspopup="true"
                    aria-expanded={menuOpen ? "true" : undefined}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                        background: "transparent",
                        border: `1px solid ${menuOpen ? "rgba(155,123,247,0.4)" : BORDER}`,
                        borderRadius: "10px",
                        pl: 0.6,
                        pr: { xs: 0.6, sm: 1 },
                        py: 0.5,
                        color: "inherit",
                        font: "inherit",
                        transition: "all 0.15s ease",
                        "&:hover": { borderColor: "rgba(155,123,247,0.4)", background: "rgba(155,123,247,0.06)" },
                    }}
                >
                    <Avatar
                        src={user.avatar || undefined}
                        sx={{ width: 28, height: 28, fontSize: "0.85rem", bgcolor: "rgba(155,123,247,0.4)" }}
                    >
                        {initials(user)}
                    </Avatar>
                    <Stack sx={{ display: { xs: "none", sm: "flex" }, alignItems: "flex-start", lineHeight: 1.1 }}>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#f5f5f4", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.name || user.email}
                        </Typography>
                        <Typography sx={{ fontSize: "0.7rem", color: "rgba(245,245,244,0.45)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.email}
                        </Typography>
                    </Stack>
                    <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "rgba(245,245,244,0.5)", display: { xs: "none", sm: "block" } }} />
                </Box>

                <Menu
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={() => setAnchorEl(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                    slotProps={{
                        paper: {
                            sx: {
                                mt: 1,
                                minWidth: 248,
                                background: "#13161d",
                                border: `1px solid ${BORDER}`,
                                borderRadius: "12px",
                                color: "#f5f5f4",
                                boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                            },
                        },
                    }}
                >
                    {/* Identity header */}
                    <Box sx={{ px: 2, pt: 1.6, pb: 1.3 }}>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                            <Avatar
                                src={user.avatar || undefined}
                                sx={{ width: 38, height: 38, fontSize: "1rem", bgcolor: "rgba(155,123,247,0.4)" }}
                            >
                                {initials(user)}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#f5f5f4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {user.name || user.email}
                                </Typography>
                                <Typography sx={{ fontSize: "0.76rem", color: "rgba(245,245,244,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {user.email}
                                </Typography>
                            </Box>
                        </Stack>
                        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 1.3 }}>
                            <Chip
                                label="Starter plan"
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: "0.66rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.02em",
                                    color: "#c4b5fd",
                                    bgcolor: "rgba(155,123,247,0.12)",
                                    border: "1px solid rgba(155,123,247,0.3)",
                                }}
                            />
                            <Box sx={{ flexGrow: 1 }} />
                            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,245,244,0.35)" }}>
                                Workspace
                            </Typography>
                            <Typography sx={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.68rem", color: "rgba(245,245,244,0.55)", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {user.tenantId}
                            </Typography>
                        </Stack>
                    </Box>
                    <Divider sx={{ borderColor: BORDER }} />

                    {/* Account */}
                    <MenuItem component={Link} href="/dashboard" onClick={() => setAnchorEl(null)} sx={MENU_ITEM_SX}>
                        <SpaceDashboardIcon sx={MENU_ICON_SX} />
                        Overview
                    </MenuItem>
                    <MenuItem component={Link} href="/dashboard/settings" onClick={() => setAnchorEl(null)} sx={MENU_ITEM_SX}>
                        <ManageAccountsIcon sx={MENU_ICON_SX} />
                        Account &amp; workspace
                    </MenuItem>
                    <MenuItem component={Link} href="/dashboard/billing" onClick={() => setAnchorEl(null)} sx={MENU_ITEM_SX}>
                        <CreditCardIcon sx={MENU_ICON_SX} />
                        Billing &amp; plan
                    </MenuItem>
                    <Divider sx={{ borderColor: BORDER }} />

                    {/* Resources */}
                    <MenuItem component={Link} href="/docs" onClick={() => setAnchorEl(null)} sx={MENU_ITEM_SX}>
                        <MenuBookIcon sx={MENU_ICON_SX} />
                        Documentation
                    </MenuItem>
                    <MenuItem component="a" href="mailto:hello@elixpo.com" sx={MENU_ITEM_SX}>
                        <SupportAgentIcon sx={MENU_ICON_SX} />
                        Contact support
                    </MenuItem>
                    <MenuItem component={Link} href="/" onClick={() => setAnchorEl(null)} sx={MENU_ITEM_SX}>
                        <OpenInNewIcon sx={MENU_ICON_SX} />
                        Marketing site
                    </MenuItem>
                    <Divider sx={{ borderColor: BORDER }} />

                    {/* Session */}
                    <MenuItem
                        component="a"
                        href="/api/auth/logout"
                        sx={{
                            fontSize: "0.86rem",
                            py: 1.0,
                            gap: 1.3,
                            color: "#fca5a5",
                            "&:hover": { background: "rgba(239,68,68,0.08)", color: "#fecaca" },
                        }}
                    >
                        <LogoutIcon sx={{ fontSize: 18 }} />
                        Sign out
                    </MenuItem>
                </Menu>
            </Box>

            {/* Mobile nav drawer */}
            <Drawer
                anchor="left"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{ display: { xs: "block", md: "none" } }}
                PaperProps={{
                    sx: {
                        width: 264,
                        px: 1.5,
                        py: 2,
                        background: "#0d1016",
                        borderRight: `1px solid ${BORDER}`,
                        color: "#f5f5f4",
                    },
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5, px: 0.5 }}>
                    <Brand />
                    <IconButton onClick={() => setMobileOpen(false)} sx={{ color: "rgba(245,245,244,0.6)" }} aria-label="Close menu">
                        <CloseIcon />
                    </IconButton>
                </Stack>
                <DashboardNavLinks orientation="vertical" onNavigate={() => setMobileOpen(false)} />
            </Drawer>
        </>
    );
}
