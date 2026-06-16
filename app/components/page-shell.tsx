"use client";

import { Box } from "@mui/material";
import type React from "react";
import BackgroundAurora from "./background-aurora";
import Footer from "./footer";
import Navbar from "./navbar";

/** Standard marketing/content shell: aurora background, navbar, footer. */
export default function PageShell({
    children,
    variant = "default",
}: {
    children: React.ReactNode;
    variant?: "default" | "auth" | "warm" | "docs";
}) {
    return (
        <Box sx={{ position: "relative", minHeight: "100vh", color: "#f5f5f4" }}>
            <BackgroundAurora variant={variant} />
            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Box sx={{ position: "sticky", top: 0, zIndex: 1000 }}>
                    <Navbar />
                </Box>
                <Box component="main">{children}</Box>
                <Footer />
            </Box>
        </Box>
    );
}
