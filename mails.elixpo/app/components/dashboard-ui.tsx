import type { SvgIconComponent } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import type React from "react";
import { GlassCard } from "./glass-card";

const ACCENT = "#9b7bf7";
const TEXT = "#f5f5f4";
const TEXT_55 = "rgba(245,245,244,0.55)";
const BORDER = "rgba(255,255,255,0.07)";

export const PRIMARY_BTN = {
    textTransform: "none" as const,
    fontWeight: 700,
    fontSize: "0.92rem",
    color: "#fff",
    px: 2.6,
    py: 1,
    borderRadius: "11px",
    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
    boxShadow: "0 8px 24px rgba(124,92,255,0.35)",
    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
};

export const GHOST_BTN = {
    textTransform: "none" as const,
    fontWeight: 600,
    fontSize: "0.9rem",
    color: TEXT,
    px: 2.4,
    py: 1,
    borderRadius: "11px",
    border: "1px solid rgba(255,255,255,0.16)",
    "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
};

/** Page header: title + one-line description, optional right-aligned action. */
export function PageHeader({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
            sx={{ mb: { xs: 3.5, md: 4.5 } }}
        >
            <Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.55rem", md: "1.9rem" }, letterSpacing: "-0.02em", color: TEXT }}>
                    {title}
                </Typography>
                <Typography sx={{ color: TEXT_55, fontSize: "0.95rem", mt: 0.5, maxWidth: 620 }}>
                    {description}
                </Typography>
            </Box>
            {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
        </Stack>
    );
}

/** A "coming soon" / present primary action button (defaults to disabled-style link). */
export function ActionButton({
    label,
    href = "#",
    icon: Icon,
    comingSoon = false,
}: {
    label: string;
    href?: string;
    icon?: SvgIconComponent;
    comingSoon?: boolean;
}) {
    return (
        <Button
            component={href.startsWith("/") ? Link : "a"}
            href={href}
            startIcon={Icon ? <Icon sx={{ fontSize: "1.1rem !important" }} /> : undefined}
            sx={{
                ...PRIMARY_BTN,
                ...(comingSoon
                    ? {
                          background: "rgba(255,255,255,0.05)",
                          color: "rgba(245,245,244,0.6)",
                          boxShadow: "none",
                          border: `1px solid ${BORDER}`,
                          "&:hover": { background: "rgba(255,255,255,0.07)" },
                      }
                    : {}),
            }}
        >
            {label}
        </Button>
    );
}

/** Centered empty-state inside a GlassCard: icon + headline + subtext + CTA. */
export function EmptyState({
    icon: Icon,
    accent = ACCENT,
    headline,
    subtext,
    cta,
}: {
    icon: SvgIconComponent;
    accent?: string;
    headline: string;
    subtext: string;
    cta?: React.ReactNode;
}) {
    return (
        <GlassCard sx={{ py: { xs: 6, md: 8 } }}>
            <Stack alignItems="center" textAlign="center" spacing={2.2}>
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "18px",
                        display: "grid",
                        placeItems: "center",
                        color: accent,
                        background: `${accent}14`,
                        border: `1px solid ${accent}33`,
                    }}
                >
                    <Icon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.2rem", color: TEXT, mb: 0.8 }}>
                        {headline}
                    </Typography>
                    <Typography sx={{ color: TEXT_55, fontSize: "0.95rem", lineHeight: 1.65, maxWidth: 460, mx: "auto" }}>
                        {subtext}
                    </Typography>
                </Box>
                {cta}
            </Stack>
        </GlassCard>
    );
}
