"use client";

import { Box, Container, Stack, Typography } from "@mui/material";
import type React from "react";
import PageShell from "./page-shell";

const ACCENT = "#9b7bf7";
const TEXT = "#f5f5f4";
const TEXT_70 = "rgba(245,245,244,0.72)";

/** Chrome for a legal/policy document: aurora shell + centered prose column. */
export function LegalShell({
    title,
    updated,
    intro,
    children,
}: {
    title: string;
    updated: string;
    intro?: string;
    children: React.ReactNode;
}) {
    return (
        <PageShell variant="docs">
            <Container maxWidth="md" sx={{ pt: { xs: 7, md: 11 }, pb: { xs: 8, md: 12 } }}>
                <Box sx={{ maxWidth: 760, mx: "auto" }}>
                    <Typography
                        sx={{
                            color: ACCENT,
                            fontWeight: 700,
                            fontSize: "0.76rem",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            mb: 1.5,
                        }}
                    >
                        Legal
                    </Typography>
                    <Typography
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: "2.1rem", md: "2.8rem" },
                            letterSpacing: "-0.02em",
                            lineHeight: 1.08,
                            color: TEXT,
                            mb: 1.5,
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.45)",
                            fontSize: "0.85rem",
                            mb: intro ? 2.5 : 4,
                        }}
                    >
                        Last updated {updated}
                    </Typography>
                    {intro && (
                        <Typography
                            sx={{ color: TEXT_70, fontSize: "1.05rem", lineHeight: 1.75, mb: 4 }}
                        >
                            {intro}
                        </Typography>
                    )}
                    <Stack spacing={4}>{children}</Stack>

                    <Box
                        sx={{
                            mt: 6,
                            pt: 3,
                            borderTop: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(245,245,244,0.45)",
                            fontSize: "0.85rem",
                            lineHeight: 1.7,
                        }}
                    >
                        Questions about this policy? Contact us at{" "}
                        <Box
                            component="a"
                            href="mailto:hello@elixpo.com"
                            sx={{
                                color: ACCENT,
                                textDecoration: "none",
                                "&:hover": { textDecoration: "underline" },
                            }}
                        >
                            hello@elixpo.com
                        </Box>
                        .
                    </Box>
                </Box>
            </Container>
        </PageShell>
    );
}

/** A titled section within a legal document. */
export function LegalSection({
    heading,
    children,
}: { heading: string; children: React.ReactNode }) {
    return (
        <Box component="section">
            <Typography
                component="h2"
                sx={{
                    fontWeight: 700,
                    fontSize: { xs: "1.25rem", md: "1.4rem" },
                    letterSpacing: "-0.01em",
                    color: TEXT,
                    mb: 1.5,
                }}
            >
                {heading}
            </Typography>
            <Stack spacing={1.5}>{children}</Stack>
        </Box>
    );
}

/** A paragraph of legal prose. */
export function LegalP({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{ color: TEXT_70, fontSize: "0.98rem", lineHeight: 1.78 }}>
            {children}
        </Typography>
    );
}

/** A bulleted list of points. */
export function LegalList({ items }: { items: React.ReactNode[] }) {
    return (
        <Stack component="ul" spacing={1} sx={{ m: 0, pl: 0, listStyle: "none" }}>
            {items.map((item, i) => (
                <Stack key={i} component="li" direction="row" spacing={1.4} alignItems="flex-start">
                    <Box
                        aria-hidden
                        sx={{
                            mt: "0.6em",
                            flexShrink: 0,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: ACCENT,
                        }}
                    />
                    <Typography sx={{ color: TEXT_70, fontSize: "0.98rem", lineHeight: 1.75 }}>
                        {item}
                    </Typography>
                </Stack>
            ))}
        </Stack>
    );
}
