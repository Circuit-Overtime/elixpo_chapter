"use client";

import { Box, Chip, Typography } from "@mui/material";
import type React from "react";

export function DocTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            component="h1"
            sx={{
                fontWeight: 800,
                fontSize: "2rem",
                letterSpacing: "-0.02em",
                mb: 2,
                color: "#fff",
            }}
        >
            {children}
        </Typography>
    );
}

export function DocLead({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "1.02rem",
                lineHeight: 1.7,
                mb: 3,
            }}
        >
            {children}
        </Typography>
    );
}

export function DocH2({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            component="h2"
            sx={{
                fontWeight: 700,
                fontSize: "1.35rem",
                mt: 4,
                mb: 1.5,
                color: "#fff",
                letterSpacing: "-0.01em",
            }}
        >
            {children}
        </Typography>
    );
}

export function DocP({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.75,
                mb: 1.5,
                fontSize: "0.98rem",
            }}
        >
            {children}
        </Typography>
    );
}

export function DocList({ items }: { items: React.ReactNode[] }) {
    return (
        <Box
            component="ul"
            sx={{
                color: "rgba(255,255,255,0.72)",
                pl: 3,
                mb: 2,
                "& li": { mb: 0.8, lineHeight: 1.65 },
            }}
        >
            {items.map((it, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static docs list
                <li key={i}>{it}</li>
            ))}
        </Box>
    );
}

export function Code({ children }: { children: React.ReactNode }) {
    return (
        <Box
            component="code"
            sx={{
                fontFamily: "var(--font-geist-mono)",
                fontSize: "0.85rem",
                background: "rgba(155,123,247,0.12)",
                color: "#c4b5fd",
                px: 0.6,
                py: 0.2,
                borderRadius: "6px",
            }}
        >
            {children}
        </Box>
    );
}

export function BaseUrlChip() {
    return (
        <Chip
            label="Base URL: https://payouts.elixpo.com"
            sx={{
                bgcolor: "rgba(155,123,247,0.1)",
                color: "#9b7bf7",
                border: "1px solid rgba(155,123,247,0.2)",
                fontFamily: "var(--font-geist-mono)",
                fontSize: "0.82rem",
                mb: 3,
            }}
        />
    );
}
