"use client";

import { Box, Chip, Typography } from "@mui/material";
import Link from "next/link";
import type React from "react";

const ACCENT = "#9b7bf7";
const TEXT = "#f5f5f4";

export function DocTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            component="h1"
            sx={{ fontWeight: 800, fontSize: "2rem", letterSpacing: "-0.02em", mb: 2, color: TEXT }}
        >
            {children}
        </Typography>
    );
}

export function DocLead({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{ color: "rgba(245,245,244,0.7)", fontSize: "1.02rem", lineHeight: 1.7, mb: 3 }}>
            {children}
        </Typography>
    );
}

export function DocH2({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            component="h2"
            sx={{ fontWeight: 700, fontSize: "1.35rem", mt: 4, mb: 1.5, color: TEXT, letterSpacing: "-0.01em" }}
        >
            {children}
        </Typography>
    );
}

export function DocH3({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            component="h3"
            sx={{ fontWeight: 600, fontSize: "1.08rem", mt: 3, mb: 1, color: TEXT }}
        >
            {children}
        </Typography>
    );
}

export function DocP({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{ color: "rgba(245,245,244,0.72)", lineHeight: 1.75, mb: 1.5, fontSize: "0.98rem" }}>
            {children}
        </Typography>
    );
}

export function DocList({ items }: { items: React.ReactNode[] }) {
    return (
        <Box component="ul" sx={{ color: "rgba(245,245,244,0.72)", pl: 3, mb: 2, "& li": { mb: 0.8, lineHeight: 1.65 } }}>
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
            label="Base URL: https://mails.elixpo.com"
            sx={{
                bgcolor: "rgba(155,123,247,0.1)",
                color: ACCENT,
                border: "1px solid rgba(155,123,247,0.2)",
                fontFamily: "var(--font-geist-mono)",
                fontSize: "0.82rem",
                mb: 3,
            }}
        />
    );
}

/** A note / tip callout box. */
export function Callout({
    title,
    children,
    tone = "info",
}: {
    title?: string;
    children: React.ReactNode;
    tone?: "info" | "warn";
}) {
    const accent = tone === "warn" ? "#f7b955" : ACCENT;
    return (
        <Box
            sx={{
                my: 2.5,
                p: 2,
                borderRadius: "12px",
                border: `1px solid ${accent}33`,
                background: `${accent}10`,
                borderLeft: `3px solid ${accent}`,
            }}
        >
            {title && (
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: accent, mb: 0.5, letterSpacing: "0.01em" }}>
                    {title}
                </Typography>
            )}
            <Box sx={{ color: "rgba(245,245,244,0.75)", fontSize: "0.92rem", lineHeight: 1.65, "& a": { color: accent } }}>
                {children}
            </Box>
        </Box>
    );
}

/** A "next:" navigation link at the bottom of a page. */
export function NextLink({ href, label }: { href: string; label: string }) {
    return (
        <Box sx={{ mt: 4 }}>
            <Box
                component={Link}
                href={href}
                sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.8,
                    color: ACCENT,
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    textDecoration: "none",
                    px: 2,
                    py: 1,
                    borderRadius: "10px",
                    border: "1px solid rgba(155,123,247,0.25)",
                    "&:hover": { borderColor: ACCENT, background: "rgba(155,123,247,0.06)" },
                }}
            >
                Next: {label} →
            </Box>
        </Box>
    );
}
