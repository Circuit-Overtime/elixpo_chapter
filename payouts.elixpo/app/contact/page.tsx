"use client";

import EmailIcon from "@mui/icons-material/MailOutline";
import GitHubIcon from "@mui/icons-material/GitHub";
import DescriptionIcon from "@mui/icons-material/Description";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import PageShell from "../components/page-shell";

const EMAIL = "hello@elixpo.com";

export default function ContactPage() {
    return (
        <PageShell>
            <Container maxWidth="sm" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 } }}>
                <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ mb: 4 }}>
                    <Typography sx={{ color: "#b69aff", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Contact
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: "2rem", md: "2.6rem" }, letterSpacing: "-0.02em", color: "#f5f5f4" }}>
                        Get in touch
                    </Typography>
                    <Typography sx={{ maxWidth: 480, color: "rgba(245,245,244,0.65)", fontSize: "1.02rem", lineHeight: 1.7 }}>
                        Elixpo Pay is operated by Elixpo. Questions about billing, a
                        payment, or an integration? We're happy to help.
                    </Typography>
                </Stack>

                <Box
                    sx={{
                        p: { xs: 3, md: 4 },
                        borderRadius: "20px",
                        background: "#0e1117",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "8px 8px 26px rgba(0,0,0,0.45), -6px -6px 18px rgba(255,255,255,0.02)",
                    }}
                >
                    <Typography sx={{ fontSize: "0.72rem", color: "rgba(245,245,244,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                        Email
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", color: "#f5f5f4", mb: 0.5 }}>
                        {EMAIL}
                    </Typography>
                    <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.88rem", mb: 2.5 }}>
                        Support & billing — we reply within 2 business days.
                    </Typography>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <Button
                            component="a"
                            href={`mailto:${EMAIL}`}
                            startIcon={<EmailIcon sx={{ fontSize: "1.1rem !important" }} />}
                            sx={{
                                flex: 1,
                                textTransform: "none",
                                fontWeight: 700,
                                color: "#fff",
                                py: 1.2,
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
                            }}
                        >
                            Email us
                        </Button>
                        <Button
                            component="a"
                            href="https://github.com/elixpo/payouts.elixpo"
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<GitHubIcon sx={{ fontSize: "1.1rem !important" }} />}
                            sx={ghostBtn}
                        >
                            GitHub
                        </Button>
                        <Button component={Link} href="/docs" startIcon={<DescriptionIcon sx={{ fontSize: "1.1rem !important" }} />} sx={ghostBtn}>
                            Docs
                        </Button>
                    </Stack>
                </Box>

                <Typography sx={{ textAlign: "center", color: "rgba(245,245,244,0.4)", fontSize: "0.85rem", mt: 3 }}>
                    For refunds and cancellations, see our{" "}
                    <Box component={Link} href="/refunds" sx={{ color: "#9b7bf7", textDecoration: "none" }}>
                        Refund & Cancellation policy
                    </Box>
                    .
                </Typography>
            </Container>
        </PageShell>
    );
}

const ghostBtn = {
    flex: 1,
    textTransform: "none",
    fontWeight: 700,
    color: "#f5f5f4",
    py: 1.2,
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.14)",
    "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
};
