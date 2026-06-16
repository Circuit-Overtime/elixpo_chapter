"use client";

import { Box, Typography } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import type React from "react";

/** Shared dark glass theme for all dashboard surfaces (matches accounts.elixpo). */
export const dashboardTheme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#9b7bf7" },
        background: { default: "transparent", paper: "rgba(255,255,255,0.03)" },
    },
    typography: { fontFamily: "var(--font-geist-sans), Arial, sans-serif" },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                },
            },
        },
    },
});

const SYMBOLS: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
};

export function formatMoney(minor: number, currency: string): string {
    const symbol = SYMBOLS[currency] ?? `${currency} `;
    return `${symbol}${(minor / 100).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

export function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso.replace(" ", "T") + (iso.includes("T") ? "" : "Z"));
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function GlassCard({
    children,
    sx,
}: {
    children: React.ReactNode;
    sx?: any;
}) {
    return (
        <Box
            sx={{
                background:
                    "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                p: { xs: 2.5, md: 3 },
                ...sx,
            }}
        >
            {children}
        </Box>
    );
}

const STATUS_COLORS: Record<string, { c: string; bg: string; b: string }> = {
    captured: { c: "#4ade80", bg: "rgba(34,197,94,0.1)", b: "rgba(34,197,94,0.3)" },
    active: { c: "#4ade80", bg: "rgba(34,197,94,0.1)", b: "rgba(34,197,94,0.3)" },
    created: { c: "#fbbf24", bg: "rgba(251,191,36,0.1)", b: "rgba(251,191,36,0.3)" },
    open: { c: "#fbbf24", bg: "rgba(251,191,36,0.1)", b: "rgba(251,191,36,0.3)" },
    failed: { c: "#f87171", bg: "rgba(239,68,68,0.1)", b: "rgba(239,68,68,0.3)" },
    expired: { c: "#9ca3af", bg: "rgba(156,163,175,0.1)", b: "rgba(156,163,175,0.2)" },
    none: { c: "#9ca3af", bg: "rgba(156,163,175,0.1)", b: "rgba(156,163,175,0.2)" },
};

export function StatusChip({ status }: { status: string }) {
    const s = STATUS_COLORS[status] ?? STATUS_COLORS.none;
    return (
        <Box
            component="span"
            sx={{
                display: "inline-block",
                px: 1.1,
                py: 0.3,
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: s.c,
                background: s.bg,
                border: `1px solid ${s.b}`,
                textTransform: "capitalize",
            }}
        >
            {status}
        </Box>
    );
}

export function StatCard({
    label,
    value,
    sub,
    accent = "#9b7bf7",
}: {
    label: string;
    value: string;
    sub?: string;
    accent?: string;
}) {
    return (
        <GlassCard sx={{ position: "relative", overflow: "hidden" }}>
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: 3,
                    background: accent,
                    opacity: 0.8,
                }}
            />
            <Typography
                sx={{
                    color: "rgba(245,245,244,0.5)",
                    fontSize: "0.78rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                }}
            >
                {label}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.9rem", mt: 0.5, color: "#f5f5f4" }}>
                {value}
            </Typography>
            {sub && (
                <Typography sx={{ color: "rgba(245,245,244,0.45)", fontSize: "0.82rem", mt: 0.3 }}>
                    {sub}
                </Typography>
            )}
        </GlassCard>
    );
}
