"use client";

import { Box } from "@mui/material";
import type React from "react";

/** Surface tokens — solid, neutral, commercial. No gradients. */
export const SURFACE = "#13161d";
export const SURFACE_HOVER = "#171b23";
export const BORDER = "rgba(255,255,255,0.07)";

/** Frosted-glass surface card used across marketing and dashboard surfaces. */
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

export default GlassCard;
