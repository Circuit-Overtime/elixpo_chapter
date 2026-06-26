"use client";

import {
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Menu as MenuIcon,
} from "@mui/icons-material";
import {
    AppBar,
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Toolbar,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useState } from "react";
import CopyForLlm from "./_components/copy-for-llm";

const CORAL = "#ff7759";
const INK = "#212121";
const SLATE = "#75758a";
const HAIRLINE = "#d9d9dd";

const DOCS_NAV = [
    { label: "Overview", href: "/docs" },
    { label: "Quickstart", href: "/docs/quickstart" },
    { label: "Authentication", href: "/docs/authentication" },
    { label: "Triggering", href: "/docs/triggering" },
    { label: "Templates", href: "/docs/templates" },
    { label: "Attachments", href: "/docs/attachments" },
    { label: "Unsubscribe", href: "/docs/unsubscribe" },
    { label: "Delivery logs", href: "/docs/logs" },
];

const navBtn = {
    color: INK,
    borderColor: HAIRLINE,
    textTransform: "none" as const,
    fontWeight: 500,
    px: 2.8,
    py: 0.9,
    border: "1px solid",
    borderRadius: "32px", // Pill
    fontFamily: "var(--font-sans)",
    transition: "all 0.2s ease",
    "&:hover": { borderColor: "#000000", bgcolor: "rgba(0, 0, 0, 0.02)" },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const idx = DOCS_NAV.findIndex((n) => n.href === pathname);
    const prev = idx > 0 ? DOCS_NAV[idx - 1] : null;
    const next = idx >= 0 && idx < DOCS_NAV.length - 1 ? DOCS_NAV[idx + 1] : null;

    const sidebar = (
        <Box sx={{ p: 2 }}>
            <List sx={{ px: 0 }}>
                {DOCS_NAV.map((item) => {
                    const active = pathname === item.href;
                    return (
                        <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                component={Link}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                sx={{
                                    borderRadius: "8px",
                                    py: 0.8,
                                    px: 2,
                                    bgcolor: active ? "rgba(255, 119, 89, 0.06)" : "transparent",
                                    color: active ? CORAL : "rgba(33, 33, 33, 0.65)",
                                    transition: "all 0.15s ease",
                                    "&:hover": {
                                        bgcolor: active
                                            ? "rgba(255, 119, 89, 0.1)"
                                            : "rgba(0, 0, 0, 0.04)",
                                        color: active ? CORAL : INK,
                                    },
                                }}
                            >
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontSize: "0.88rem",
                                        fontWeight: active ? 500 : 400,
                                        fontFamily: "var(--font-sans)",
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <Box sx={{ position: "relative", minHeight: "100vh", color: INK, background: "#ffffff" }}>
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100vh",
                }}
            >
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        bgcolor: "rgba(255, 255, 255, 0.85)",
                        backdropFilter: "blur(16px)",
                        borderBottom: `1px solid ${HAIRLINE}`,
                        color: INK,
                    }}
                >
                    <Toolbar
                        sx={{ maxWidth: "1280px", width: "100%", mx: "auto", px: { xs: 2, md: 3 } }}
                    >
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            sx={{ mr: 2, display: { md: "none" } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Box
                            component={Link}
                            href="/"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.2,
                                textDecoration: "none",
                            }}
                        >
                            <Box
                                component="img"
                                src="/logo.png"
                                alt="Elixpo Mails"
                                sx={{
                                    height: 28,
                                    width: 28,
                                    borderRadius: "8px",
                                    display: "block",
                                }}
                            />
                            <Typography
                                sx={{
                                    fontWeight: 500,
                                    color: "#000000",
                                    display: { xs: "none", sm: "block" },
                                    fontFamily: "var(--font-display)",
                                }}
                            >
                                Elixpo Mails{" "}
                                <Box component="span" sx={{ color: SLATE, fontWeight: 400 }}>
                                    Docs
                                </Box>
                            </Typography>
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        <CopyForLlm />
                    </Toolbar>
                </AppBar>

                <Box
                    sx={{
                        display: "flex",
                        flexGrow: 1,
                        maxWidth: "1280px",
                        width: "100%",
                        mx: "auto",
                        px: { xs: 2, md: 3 },
                    }}
                >
                    <Box
                        component="nav"
                        sx={{
                            width: 240,
                            flexShrink: 0,
                            display: { xs: "none", md: "block" },
                            borderRight: `1px solid ${HAIRLINE}`,
                            position: "sticky",
                            top: 64,
                            height: "calc(100vh - 64px)",
                            overflowY: "auto",
                            pt: 2,
                        }}
                    >
                        {sidebar}
                    </Box>

                    <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={() => setMobileOpen(false)}
                        ModalProps={{ keepMounted: true }}
                        sx={{
                            display: { xs: "block", md: "none" },
                            "& .MuiDrawer-paper": {
                                width: 260,
                                bgcolor: "#ffffff",
                                borderRight: `1px solid ${HAIRLINE}`,
                            },
                        }}
                    >
                        {sidebar}
                    </Drawer>

                    <Box
                        component="main"
                        sx={{
                            flexGrow: 1,
                            minWidth: 0,
                            pt: 5,
                            pb: 8,
                            px: { xs: 0, md: 5 },
                            maxWidth: 820,
                        }}
                    >
                        {children}

                        <Divider sx={{ my: 5, borderColor: HAIRLINE }} />
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 2,
                                flexWrap: "wrap",
                            }}
                        >
                            {prev ? (
                                <Button
                                    component={Link}
                                    href={prev.href}
                                    startIcon={<ArrowBackIcon />}
                                    sx={navBtn}
                                >
                                    {prev.label}
                                </Button>
                            ) : (
                                <Box />
                            )}
                            {next ? (
                                <Button
                                    component={Link}
                                    href={next.href}
                                    endIcon={<ArrowForwardIcon />}
                                    sx={navBtn}
                                >
                                    {next.label}
                                </Button>
                            ) : (
                                <Box />
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
