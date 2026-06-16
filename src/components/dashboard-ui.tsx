"use client";

import { Box, Typography } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import type React from "react";

/** Surface tokens — solid, neutral, commercial. No gradients. */
export const SURFACE = "#13161d";
export const SURFACE_HOVER = "#171b23";
export const BORDER = "rgba(255,255,255,0.07)";

/** Shared dark theme for all dashboard surfaces. */
export const dashboardTheme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#9b7bf7" },
        background: { default: "#0c0e13", paper: SURFACE },
    },
    typography: { fontFamily: "var(--font-geist-sans), Arial, sans-serif" },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "12px",
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
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: "12px",
                p: { xs: 2.5, md: 3 },
                boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                ...sx,
            }}
        >
            {children}
        </Box>
    );
}

const STATUS_COLORS: Record<string, { c: string; bg: string; b: string }> = {
    captured: { c: "#4ade80", bg: "rgba(34,197,94,0.1)", b: "rgba(34,197,94,0.25)" },
    active: { c: "#4ade80", bg: "rgba(34,197,94,0.1)", b: "rgba(34,197,94,0.25)" },
    created: { c: "#fbbf24", bg: "rgba(251,191,36,0.1)", b: "rgba(251,191,36,0.25)" },
    open: { c: "#fbbf24", bg: "rgba(251,191,36,0.1)", b: "rgba(251,191,36,0.25)" },
    failed: { c: "#f87171", bg: "rgba(239,68,68,0.1)", b: "rgba(239,68,68,0.25)" },
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
                borderRadius: "6px",
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
        <GlassCard>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.2 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />
                <Typography
                    sx={{
                        color: "rgba(245,245,244,0.5)",
                        fontSize: "0.76rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontWeight: 600,
                    }}
                >
                    {label}
                </Typography>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.85rem", color: "#f5f5f4", lineHeight: 1.1 }}>
                {value}
            </Typography>
            {sub && (
                <Typography sx={{ color: "rgba(245,245,244,0.42)", fontSize: "0.82rem", mt: 0.6 }}>
                    {sub}
                </Typography>
            )}
        </GlassCard>
    );
}
