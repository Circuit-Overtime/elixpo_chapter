"use client";

export const runtime = "edge";

import {
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Check as CheckIcon,
    ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import MenuIcon from "@mui/icons-material/Menu";
import {
    Box,
    Button,
    Divider,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Snackbar,
    Toolbar,
    Tooltip,
    Typography,
} from "@mui/material";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import { ThemeProvider } from "@mui/material/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { dashboardTheme } from "@/components/dashboard-ui";
import BackgroundAurora from "../components/background-aurora";

const DOCS_NAV = [
    { label: "Overview", href: "/docs" },
    { label: "Quickstart", href: "/docs/quickstart" },
    { label: "Catalog sync", href: "/docs/catalog" },
    { label: "Checkout sessions", href: "/docs/checkout" },
    { label: "Webhooks", href: "/docs/webhooks" },
    { label: "Entitlements API", href: "/docs/entitlements" },
];

export default function DocsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const buildLlmPayload = (): string => {
        const root = document.getElementById("docs-content");
        if (!root) return "";

        const lines: string[] = [];
        const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) return;
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            const text = (el.textContent || "").trim();
            if (!text && tag !== "pre" && tag !== "code") {
                el.childNodes.forEach(walk);
                return;
            }
            switch (tag) {
                case "h1":
                    lines.push(`# ${text}`, "");
                    return;
                case "h2":
                    lines.push("", `## ${text}`, "");
                    return;
                case "h3":
                    lines.push("", `### ${text}`, "");
                    return;
                case "h4":
                    lines.push("", `#### ${text}`, "");
                    return;
                case "li":
                    lines.push(`- ${text}`);
                    return;
                case "pre": {
                    const code = el.textContent || "";
                    lines.push("", "```", code.trim(), "```", "");
                    return;
                }
                case "code":
                    if (
                        el.parentElement &&
                        el.parentElement.tagName.toLowerCase() !== "pre"
                    ) {
                        return;
                    }
                    return;
                case "p":
                    lines.push(text, "");
                    return;
                default:
                    el.childNodes.forEach(walk);
            }
        };
        root.childNodes.forEach(walk);

        const pageTitle =
            DOCS_NAV.find((n) => n.href === pathname)?.label || "Overview";
        const url =
            typeof window !== "undefined"
                ? `${window.location.origin}${pathname}`
                : pathname;

        const header = [
            `# Elixpo Pay Docs — ${pageTitle}`,
            "",
            `Source: ${url}`,
            "",
            "This is one section of the Elixpo Pay developer documentation. Elixpo Pay is the payments and creator payouts platform for Elixpo.",
            "",
            "---",
            "",
        ].join("\n");

        return `${
            header +
            lines
                .join("\n")
                .replace(/\n{3,}/g, "\n\n")
                .trim()
        }\n`;
    };

    const handleCopyForLlm = async () => {
        const payload = buildLlmPayload();
        if (!payload) return;
        try {
            await navigator.clipboard.writeText(payload);
            setCopied(true);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = payload;
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand("copy");
                setCopied(true);
            } catch {}
            document.body.removeChild(ta);
        }
    };

    const idx = DOCS_NAV.findIndex((n) => n.href === pathname);
    const prev = idx > 0 ? DOCS_NAV[idx - 1] : null;
    const next =
        idx >= 0 && idx < DOCS_NAV.length - 1 ? DOCS_NAV[idx + 1] : null;

    const sidebar = (
        <Box sx={{ p: 2 }}>
            <List sx={{ px: 0 }}>
                {DOCS_NAV.map((item) => {
                    const active = pathname === item.href;
                    return (
                        <ListItem
                            key={item.href}
                            disablePadding
                            sx={{ mb: 0.5 }}
                        >
                            <ListItemButton
                                component={Link}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                sx={{
                                    borderRadius: "8px",
                                    py: 0.9,
                                    px: 2,
                                    bgcolor: active
                                        ? "rgba(155,123,247,0.1)"
                                        : "transparent",
                                    color: active
                                        ? "#9b7bf7"
                                        : "rgba(255,255,255,0.65)",
                                    "&:hover": {
                                        bgcolor: active
                                            ? "rgba(155,123,247,0.15)"
                                            : "rgba(255,255,255,0.05)",
                                        color: active
                                            ? "#9b7bf7"
                                            : "rgba(255,255,255,0.9)",
                                    },
                                }}
                            >
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontSize: "0.9rem",
                                        fontWeight: active ? 600 : 500,
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
        <ThemeProvider theme={dashboardTheme}>
            <Snackbar
                open={copied}
                autoHideDuration={2400}
                onClose={() => setCopied(false)}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
                message="Copied page as markdown to clipboard — paste into any LLM"
            />
            <Box
                sx={{
                    position: "relative",
                    minHeight: "100vh",
                    bgcolor: "#0b0c10",
                    color: "#f5f5f4",
                }}
            >
                <BackgroundAurora variant="docs" />
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
                            bgcolor: "rgba(11,13,18,0.5)",
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
                            }}
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
                                    src="/mark.png"
                                    alt="Elixpo Pay"
                                    sx={{
                                        height: 28,
                                        width: 28,
                                        borderRadius: "8px",
                                        display: "block",
                                    }}
                                />
                                <Typography
                                    sx={{ fontWeight: 700, color: "#f5f5f4" }}
                                >
                                    Elixpo Pay{" "}
                                    <Box
                                        component="span"
                                        sx={{
                                            color: "rgba(255,255,255,0.4)",
                                            fontWeight: 500,
                                        }}
                                    >
                                        Docs
                                    </Box>
                                </Typography>
                            </Box>
                            <Box sx={{ flexGrow: 1 }} />
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <Tooltip
                                    title={
                                        copied
                                            ? "Copied!"
                                            : "Copy this page as plain text to paste into an LLM"
                                    }
                                    arrow
                                >
                                    <Button
                                        onClick={handleCopyForLlm}
                                        startIcon={
                                            copied ? (
                                                <CheckIcon
                                                    sx={{
                                                        fontSize:
                                                            "1.1rem !important",
                                                    }}
                                                />
                                            ) : (
                                                <ContentCopyIcon
                                                    sx={{
                                                        fontSize:
                                                            "1.05rem !important",
                                                    }}
                                                />
                                            )
                                        }
                                        sx={{
                                            color: copied
                                                ? "#86efac"
                                                : "rgba(255, 255, 255, 0.75)",
                                            textTransform: "none",
                                            fontWeight: 600,
                                            fontSize: "0.85rem",
                                            px: 1.5,
                                            borderRadius: "8px",
                                            border: "1px solid rgba(255,255,255,0.12)",
                                            "&:hover": {
                                                color: "#fff",
                                                bgcolor:
                                                    "rgba(155,123,247,0.08)",
                                                borderColor:
                                                    "rgba(155,123,247,0.4)",
                                            },
                                        }}
                                    >
                                        {copied ? "Copied" : "Copy for LLM"}
                                    </Button>
                                </Tooltip>
                                <Button
                                    component={Link}
                                    href="/dashboard"
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "0.85rem",
                                        color: "rgba(255,255,255,0.7)",
                                        "&:hover": {
                                            color: "#fff",
                                            bgcolor: "rgba(255,255,255,0.06)",
                                        },
                                    }}
                                >
                                    Dashboard
                                </Button>
                            </Box>
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
                                borderRight: "1px solid rgba(255,255,255,0.06)",
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
                                    bgcolor: "rgba(11,13,18,0.96)",
                                    backdropFilter: "blur(20px)",
                                    borderRight:
                                        "1px solid rgba(255,255,255,0.08)",
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
                                pt: 4,
                                pb: 8,
                                px: { xs: 0, md: 5 },
                                maxWidth: 820,
                            }}
                        >
                            <Box id="docs-content">{children}</Box>

                            <Divider
                                sx={{
                                    my: 4,
                                    borderColor: "rgba(255,255,255,0.06)",
                                }}
                            />
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
        </ThemeProvider>
    );
}

const navBtn = {
    color: "#9b7bf7",
    borderColor: "rgba(155,123,247,0.2)",
    textTransform: "none",
    fontWeight: 600,
    px: 2,
    py: 1,
    border: "1px solid",
    borderRadius: "8px",
    "&:hover": { borderColor: "#9b7bf7", bgcolor: "rgba(155,123,247,0.05)" },
};
