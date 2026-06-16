"use client";

import { Box, Container, Typography } from "@mui/material";
import type React from "react";
import BackgroundAurora from "./background-aurora";
import Footer from "./footer";
import Navbar from "./navbar";

/** Shared shell for prose pages (privacy, terms). Matches the Accounts look. */
export default function LegalShell({
    title,
    updated,
    children,
}: {
    title: string;
    updated: string;
    children: React.ReactNode;
}) {
    return (
        <Box sx={{ position: "relative", minHeight: "100vh", color: "#f5f5f4" }}>
            <BackgroundAurora variant="docs" />
            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Navbar />
                <Container maxWidth="md" sx={{ pt: { xs: 6, md: 9 }, pb: 6 }}>
                    <Typography
                        component="h1"
                        sx={{ fontWeight: 800, fontSize: { xs: "2rem", md: "2.6rem" }, letterSpacing: "-0.02em" }}
                    >
                        {title}
                    </Typography>
                    <Typography sx={{ color: "rgba(245,245,244,0.45)", mt: 1, mb: 4, fontSize: "0.9rem" }}>
                        Last updated {updated}
                    </Typography>
                    <Box
                        sx={{
                            "& h2": {
                                fontWeight: 700,
                                fontSize: "1.3rem",
                                mt: 4,
                                mb: 1.5,
                                color: "#f5f5f4",
                            },
                            "& p": {
                                color: "rgba(245,245,244,0.7)",
                                lineHeight: 1.75,
                                mb: 1.5,
                                fontSize: "0.98rem",
                            },
                            "& ul": { color: "rgba(245,245,244,0.7)", lineHeight: 1.75, pl: 3, mb: 1.5 },
                            "& li": { mb: 0.6 },
                            "& a": { color: "#9b7bf7" },
                            "& code": {
                                fontFamily: "var(--font-geist-mono)",
                                fontSize: "0.85rem",
                                background: "rgba(155,123,247,0.12)",
                                color: "#c4b5fd",
                                px: 0.6,
                                py: 0.2,
                                borderRadius: "6px",
                            },
                        }}
                    >
                        {children}
                    </Box>
                </Container>
                <Footer />
            </Box>
        </Box>
    );
}
