"use client";

import DescriptionIcon from "@mui/icons-material/Description";
import GitHubIcon from "@mui/icons-material/GitHub";
import EmailIcon from "@mui/icons-material/MailOutline";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import PageShell from "../components/page-shell";

const EMAIL = "hello@elixpo.com";

export default function ContactPage() {
    return (
        <PageShell variant="default">
            <Container
                maxWidth="sm"
                sx={{ pb: { xs: 8, md: 12 } }}
            >
                {/* Header */}
                <Stack
                    alignItems="center"
                    textAlign="center"
                    spacing={1.5}
                    sx={{ mb: 6 }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: "#CF4500" }} />
                        <Typography
                            sx={{
                                fontSize: "14px",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "#696969",
                                textTransform: "uppercase",
                                fontFamily: "var(--font-sofia-sans)",
                            }}
                        >
                            CONTACT
                        </Typography>
                    </Stack>
                    <Typography
                        variant="h2"
                        sx={{
                            fontWeight: 500,
                            fontSize: { xs: "32px", md: "42px" },
                            letterSpacing: "-2%",
                            color: "#141413",
                            fontFamily: "var(--font-sofia-sans)",
                        }}
                    >
                        Get in touch
                    </Typography>
                    <Typography
                        sx={{
                            maxWidth: 480,
                            color: "#262627",
                            fontSize: "16px",
                            lineHeight: 1.6,
                            fontFamily: "var(--font-sofia-sans)",
                            fontWeight: 450,
                        }}
                    >
                        Elixpo Pay is managed by Elixpo. Have questions about a charge, pricing tiers, or developer API integrations? We're here to assist.
                    </Typography>
                </Stack>

                {/* Contact Card Box */}
                <Box
                    sx={{
                        p: { xs: 4, md: 5 },
                        borderRadius: "24px",
                        background: "#FCFBFA", // Lifted Cream
                        border: "1.5px solid rgba(20, 20, 19, 0.06)",
                        boxShadow: "rgba(0, 0, 0, 0.04) 0px 4px 24px 0px",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "11px",
                            color: "#696969",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            fontWeight: 700,
                            mb: 1,
                            fontFamily: "var(--font-sofia-sans)",
                        }}
                    >
                        Support Email
                    </Typography>
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 500,
                            fontSize: "24px",
                            color: "#141413",
                            letterSpacing: "-1px",
                            mb: 1,
                            fontFamily: "var(--font-sofia-sans)",
                        }}
                    >
                        {EMAIL}
                    </Typography>
                    <Typography
                        sx={{
                            color: "#696969",
                            fontSize: "14px",
                            mb: 4,
                            fontFamily: "var(--font-sofia-sans)",
                            fontWeight: 450,
                        }}
                    >
                        For transaction issues or billing requests, we respond within two business days.
                    </Typography>

                    {/* Action buttons */}
                    <Stack
                        direction="column"
                        spacing={2}
                    >
                        {/* Primary Button — Ink Pill */}
                        <Button
                            component="a"
                            href={`mailto:${EMAIL}`}
                            variant="contained"
                            disableElevation
                            startIcon={<EmailIcon />}
                            sx={{
                                textTransform: "none",
                                fontWeight: 500,
                                fontSize: "16px",
                                color: "#F3F0EE", // Canvas Cream text
                                background: "#141413", // Ink Black background
                                border: "1.5px solid #141413",
                                borderRadius: "20px", // Signature button radius
                                py: 1.4,
                                fontFamily: "var(--font-sofia-sans)",
                                letterSpacing: "-0.32px",
                                "&:hover": {
                                    background: "#262627",
                                    borderColor: "#262627",
                                },
                            }}
                        >
                            Email Support Team
                        </Button>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            {/* Secondary Buttons — Outlined Pills */}
                            <Button
                                component="a"
                                href="https://github.com/elixpo/payouts.elixpo"
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="outlined"
                                disableElevation
                                startIcon={<GitHubIcon />}
                                sx={outlinedButtonStyle}
                            >
                                GitHub
                            </Button>
                            <Button
                                component={Link}
                                href="/docs"
                                variant="outlined"
                                disableElevation
                                startIcon={<DescriptionIcon />}
                                sx={outlinedButtonStyle}
                            >
                                API Docs
                            </Button>
                        </Stack>
                    </Stack>
                </Box>

                {/* Policies Link */}
                <Typography
                    sx={{
                        textAlign: "center",
                        color: "#696969",
                        fontSize: "14px",
                        mt: 4,
                        fontFamily: "var(--font-sofia-sans)",
                    }}
                >
                    For merchant refund or cancel requests, please view our{" "}
                    <Box
                        component={Link}
                        href="/refunds"
                        sx={{ color: "#3860BE", textDecoration: "none", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}
                    >
                        Refund Policy
                    </Box>
                    .
                </Typography>
            </Container>
        </PageShell>
    );
}

const outlinedButtonStyle = {
    flex: 1,
    textTransform: "none",
    fontWeight: 500,
    fontSize: "15px",
    color: "#141413",
    background: "#FFFFFF",
    border: "1.5px solid #141413",
    borderRadius: "20px",
    py: 1.2,
    fontFamily: "var(--font-sofia-sans)",
    "&:hover": {
        background: "#F4F4F4",
        borderColor: "#141413",
    },
};
