"use client";

import {
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Check as CheckIcon,
    ContentCopy as ContentCopyIcon,
    Dashboard as DashboardIcon,
    GitHub as GitHubIcon,
    Menu as MenuIcon,
    Search as SearchIcon,
} from "@mui/icons-material";
import {
    AppBar,
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Snackbar,
    TextField,
    Toolbar,
    Tooltip,
    Typography,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
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

const DOCS_NAV = [
    { label: "Overview", href: "/docs" },
    { label: "Quickstart", href: "/docs/quickstart" },
    { label: "OAuth Flow", href: "/docs/oauth" },
    { label: "Users API", href: "/docs/users-api" },
    { label: "Webhooks", href: "/docs/webhooks" },
    { label: "API Keys", href: "/docs/api-keys" },
    { label: "Error Reference", href: "/docs/errors" },
    { label: "Self-Hosting", href: "/docs/self-hosting" },
];

interface HeadingItem {
    id: string;
    text: string;
    level: number;
}

export default function DocsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [search, setSearch] = useState("");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [headings, setHeadings] = useState<HeadingItem[]>([]);
    const [activeHeadingId, setActiveHeadingId] = useState("");
    const [copied, setCopied] = useState(false);

    // Convert the rendered docs content into a markdown-ish text blob that's
    // friendly to paste into an LLM chat. We walk the DOM tree of the
    // #docs-content node and emit headings, lists, code, and paragraphs.
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
                        // inline code already captured inside paragraph text
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
            `# Elixpo Accounts Docs — ${pageTitle}`,
            "",
            `Source: ${url}`,
            "",
            "This is one section of the Elixpo Accounts developer documentation. Elixpo Accounts is an open OAuth 2.0 single sign-on built on Cloudflare's edge.",
            "",
            "---",
            "",
        ].join("\n");

        return (
            header +
            lines
                .join("\n")
                .replace(/\n{3,}/g, "\n\n")
                .trim() +
            "\n"
        );
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
            } catch {
                // give up silently
            }
            document.body.removeChild(ta);
        }
    };

    const currentPageIndex = DOCS_NAV.findIndex(
        (item) => item.href === pathname,
    );
    const prevPage =
        currentPageIndex > 0 ? DOCS_NAV[currentPageIndex - 1] : null;
    const nextPage =
        currentPageIndex < DOCS_NAV.length - 1
            ? DOCS_NAV[currentPageIndex + 1]
            : null;

    const filteredNav = DOCS_NAV.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase()),
    );

    useEffect(() => {
        const contentEl = document.getElementById("docs-content");
        if (!contentEl) return;

        const headingElements = contentEl.querySelectorAll("h2, h3");
        const list: HeadingItem[] = [];

        headingElements.forEach((el, _index) => {
            const level = Number.parseInt(el.tagName.substring(1), 10);
            const text = el.textContent || "";
            let id = el.id;
            if (!id) {
                id = text
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "");
                el.id = id;
            }
            list.push({ id, text, level });
        });

        setHeadings(list);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting);
                if (visible.length > 0) {
                    const sorted = visible.sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    );
                    setActiveHeadingId(sorted[0].target.id);
                }
            },
            { rootMargin: "-80px 0px -60% 0px" },
        );

        const contentEl = document.getElementById("docs-content");
        if (contentEl) {
            const targets = contentEl.querySelectorAll("h2, h3");
            targets.forEach((target) => {
                observer.observe(target);
            });
        }

        return () => observer.disconnect();
    }, []);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const sidebarContent = (
        <Box
            sx={{
                p: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <TextField
                placeholder="Search docs..."
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon
                                sx={{
                                    color: "rgba(255, 255, 255, 0.4)",
                                    fontSize: "1.1rem",
                                }}
                            />
                        </InputAdornment>
                    ),
                }}
                sx={{
                    mb: 3,
                    "& .MuiOutlinedInput-root": {
                        color: "#e5e7eb",
                        background: "rgba(255, 255, 255, 0.02)",
                        "& fieldset": {
                            borderColor: "rgba(255, 255, 255, 0.08)",
                        },
                        "&:hover fieldset": {
                            borderColor: "rgba(155, 123, 247, 0.4)",
                        },
                        "&.Mui-focused fieldset": { borderColor: "#9b7bf7" },
                    },
                }}
            />

            <List sx={{ px: 0, flexGrow: 1, overflowY: "auto" }}>
                {filteredNav.map((item) => {
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
                                    py: 1,
                                    px: 2,
                                    bgcolor: active
                                        ? "rgba(155, 123, 247, 0.1)"
                                        : "transparent",
                                    color: active
                                        ? "#9b7bf7"
                                        : "rgba(255, 255, 255, 0.65)",
                                    "&:hover": {
                                        bgcolor: active
                                            ? "rgba(155, 123, 247, 0.15)"
                                            : "rgba(255, 255, 255, 0.05)",
                                        color: active
                                            ? "#9b7bf7"
                                            : "rgba(255, 255, 255, 0.9)",
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
                {filteredNav.length === 0 && (
                    <Typography
                        variant="body2"
                        sx={{
                            color: "rgba(255,255,255,0.4)",
                            p: 2,
                            textAlign: "center",
                        }}
                    >
                        No results found
                    </Typography>
                )}
            </List>
        </Box>
    );

    return (
        <ThemeProvider theme={darkTheme}>
            <Box
                sx={{
                    position: "relative",
                    minHeight: "100vh",
                    bgcolor: "#0b0c10",
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
                            <IconButton
                                color="inherit"
                                aria-label="open drawer"
                                edge="start"
                                onClick={handleDrawerToggle}
                                sx={{ mr: 2, display: { md: "none" } }}
                            >
                                <MenuIcon />
                            </IconButton>

                            <Box
                                component={Link}
                                href="/docs"
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    textDecoration: "none",
                                }}
                            >
                                <Box
                                    component="img"
                                    src="/LOGO/logo.png"
                                    alt="Elixpo"
                                    sx={{
                                        height: 30,
                                        width: 30,
                                        borderRadius: "6px",
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: "1.05rem",
                                        color: "#f5f5f4",
                                        letterSpacing: "-0.01em",
                                    }}
                                >
                                    Elixpo Accounts
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
                                    href="/dashboard/oauth-apps"
                                    startIcon={
                                        <DashboardIcon
                                            sx={{
                                                fontSize: "1.1rem !important",
                                            }}
                                        />
                                    }
                                    sx={{
                                        color: "rgba(255, 255, 255, 0.65)",
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "0.85rem",
                                        px: 1.5,
                                        borderRadius: "6px",
                                        "&:hover": {
                                            color: "#fff",
                                            bgcolor: "rgba(255,255,255,0.06)",
                                        },
                                    }}
                                >
                                    Dashboard
                                </Button>
                                <IconButton
                                    component="a"
                                    href="https://github.com/elixpo/accounts.elixpo"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                        color: "rgba(255, 255, 255, 0.5)",
                                        "&:hover": {
                                            color: "#fff",
                                            bgcolor: "rgba(255,255,255,0.06)",
                                        },
                                    }}
                                >
                                    <GitHubIcon sx={{ fontSize: "1.2rem" }} />
                                </IconButton>
                            </Box>
                        </Toolbar>
                    </AppBar>

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
                            display: "flex",
                            flexGrow: 1,
                            maxWidth: "1400px",
                            width: "100%",
                            mx: "auto",
                            px: { xs: 2, md: 3 },
                        }}
                    >
                        <Box
                            component="nav"
                            sx={{
                                width: 260,
                                flexShrink: 0,
                                display: { xs: "none", md: "block" },
                                borderRight:
                                    "1px solid rgba(255, 255, 255, 0.06)",
                                position: "sticky",
                                top: 64,
                                height: "calc(100vh - 64px)",
                                overflowY: "auto",
                                pt: 3,
                            }}
                        >
                            {sidebarContent}
                        </Box>

                        <Drawer
                            variant="temporary"
                            open={mobileOpen}
                            onClose={handleDrawerToggle}
                            ModalProps={{ keepMounted: true }}
                            sx={{
                                display: { xs: "block", md: "none" },
                                "& .MuiDrawer-paper": {
                                    boxSizing: "border-box",
                                    width: 280,
                                    bgcolor: "rgba(11, 13, 18, 0.95)",
                                    backdropFilter: "blur(20px)",
                                    borderRight:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                },
                            }}
                        >
                            {sidebarContent}
                        </Drawer>

                        <Box
                            component="main"
                            sx={{
                                flexGrow: 1,
                                minWidth: 0,
                                pt: 4,
                                pb: 8,
                                px: { xs: 0, md: 4, lg: 6 },
                            }}
                        >
                            <Box id="docs-content">{children}</Box>

                            <Divider
                                sx={{
                                    my: 4,
                                    borderColor: "rgba(255, 255, 255, 0.06)",
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
                                {prevPage ? (
                                    <Button
                                        component={Link}
                                        href={prevPage.href}
                                        startIcon={<ArrowBackIcon />}
                                        sx={{
                                            color: "#9b7bf7",
                                            borderColor:
                                                "rgba(155, 123, 247, 0.2)",
                                            textTransform: "none",
                                            fontWeight: 600,
                                            px: 2,
                                            py: 1,
                                            border: "1px solid",
                                            borderRadius: "8px",
                                            "&:hover": {
                                                borderColor: "#9b7bf7",
                                                bgcolor:
                                                    "rgba(155, 123, 247, 0.05)",
                                            },
                                        }}
                                    >
                                        {prevPage.label}
                                    </Button>
                                ) : (
                                    <Box />
                                )}

                                {nextPage ? (
                                    <Button
                                        component={Link}
                                        href={nextPage.href}
                                        endIcon={<ArrowForwardIcon />}
                                        sx={{
                                            color: "#9b7bf7",
                                            borderColor:
                                                "rgba(155, 123, 247, 0.2)",
                                            textTransform: "none",
                                            fontWeight: 600,
                                            px: 2,
                                            py: 1,
                                            border: "1px solid",
                                            borderRadius: "8px",
                                            "&:hover": {
                                                borderColor: "#9b7bf7",
                                                bgcolor:
                                                    "rgba(155, 123, 247, 0.05)",
                                            },
                                        }}
                                    >
                                        {nextPage.label}
                                    </Button>
                                ) : (
                                    <Box />
                                )}
                            </Box>
                        </Box>

                        {headings.length > 0 && (
                            <Box
                                sx={{
                                    width: 220,
                                    flexShrink: 0,
                                    display: { xs: "none", lg: "block" },
                                    position: "sticky",
                                    top: 64,
                                    height: "calc(100vh - 64px)",
                                    overflowY: "auto",
                                    pt: 4,
                                    pl: 3,
                                    borderLeft:
                                        "1px solid rgba(255, 255, 255, 0.06)",
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: "rgba(255, 255, 255, 0.4)",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        tracking: "0.05em",
                                        display: "block",
                                        mb: 2,
                                    }}
                                >
                                    On this page
                                </Typography>
                                <List sx={{ p: 0 }}>
                                    {headings.map((h) => (
                                        <ListItem
                                            key={h.id}
                                            disablePadding
                                            sx={{
                                                mb: 1,
                                                pl: h.level === 3 ? 1.5 : 0,
                                            }}
                                        >
                                            <Typography
                                                component="a"
                                                href={`#${h.id}`}
                                                sx={{
                                                    fontSize: "0.82rem",
                                                    color:
                                                        activeHeadingId === h.id
                                                            ? "#9b7bf7"
                                                            : "rgba(255, 255, 255, 0.45)",
                                                    fontWeight:
                                                        activeHeadingId === h.id
                                                            ? 600
                                                            : 400,
                                                    textDecoration: "none",
                                                    lineHeight: 1.4,
                                                    transition:
                                                        "color 0.15s ease",
                                                    "&:hover": {
                                                        color: "#fff",
                                                    },
                                                }}
                                            >
                                                {h.text}
                                            </Typography>
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </ThemeProvider>
    );
}
