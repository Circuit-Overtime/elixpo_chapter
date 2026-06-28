"use client";

import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import FacebookIcon from "@mui/icons-material/Facebook";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import MapPinIcon from "@mui/icons-material/Room";
import TwitterIcon from "@mui/icons-material/Twitter";
import YouTubeIcon from "@mui/icons-material/YouTube";
import {
    Box,
    Container,
    Grid,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";

const EMAIL = "hello@elixpo.com";

const Footer = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [language, setLanguage] = useState("India (English)");

    const handleLangClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleLangClose = (lang?: string) => {
        setAnchorEl(null);
        if (lang && typeof lang === "string") {
            setLanguage(lang);
        }
    };

    return (
        <Box
            component="footer"
            sx={{
                background: "#141413", // Ink Black
                color: "#FFFFFF",
                pt: { xs: 8, md: 10 },
                pb: { xs: 12, md: 18 }, // very tall bottom padding (148px+)
                px: { xs: 2.5, md: 6 },
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                position: "relative",
                zIndex: 1,
            }}
        >
            <Container maxWidth="lg" disableGutters>
                {/* Logo Image */}
                <Box
                    component="img"
                    src="/logo.png"
                    alt="Elixpo Pay"
                    sx={{
                        height: 26,
                        width: "auto",
                        mb: 4,
                        display: "block",
                        filter: "brightness(0) invert(1)",
                    }}
                />
                {/* Large Conversational Headline */}
                <Typography
                    variant="h2"
                    sx={{
                        fontSize: { xs: "28px", md: "40px" },
                        fontWeight: 500,
                        letterSpacing: "-2%",
                        color: "#F3F0EE", // Canvas Cream
                        mb: { xs: 6, md: 8 },
                        maxWidth: "600px",
                        lineHeight: 1.2,
                        fontFamily: "var(--font-sofia-sans)",
                    }}
                >
                    We're always here when you need us.
                </Typography>

                {/* 4-Column Link Grid */}
                <Grid container spacing={{ xs: 4, md: 6 }} sx={{ mb: { xs: 6, md: 10 } }}>
                    {/* Column 1: Product */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Typography
                            sx={{
                                fontSize: "13px",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "rgba(243, 240, 238, 0.45)", // Muted cream
                                textTransform: "uppercase",
                                mb: 3,
                                fontFamily: "var(--font-sofia-sans)",
                            }}
                        >
                            Product
                        </Typography>
                        <Stack spacing={2}>
                            <Link href="/about" style={linkStyle}>Platform</Link>
                            <Link href="/pricing" style={linkStyle}>Pricing</Link>
                            <Link href="/dashboard" style={linkStyle}>Merchant Portal</Link>
                            <a href="https://github.com/elixpo/payouts.elixpo" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                                Open Source ↗
                            </a>
                        </Stack>
                    </Grid>

                    {/* Column 2: Resources */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Typography
                            sx={{
                                fontSize: "13px",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "rgba(243, 240, 238, 0.45)",
                                textTransform: "uppercase",
                                mb: 3,
                                fontFamily: "var(--font-sofia-sans)",
                            }}
                        >
                            Resources
                        </Typography>
                        <Stack spacing={2}>
                            <Link href="/docs" style={linkStyle}>Documentation</Link>
                            <Link href="/docs/quickstart" style={linkStyle}>API Reference</Link>
                            <a href="https://status.elixpo.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                                System Status ↗
                            </a>
                            <a href="https://blog.elixpo.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                                Elixpo Blog ↗
                            </a>
                        </Stack>
                    </Grid>

                    {/* Column 3: Legal */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Typography
                            sx={{
                                fontSize: "13px",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "rgba(243, 240, 238, 0.45)",
                                textTransform: "uppercase",
                                mb: 3,
                                fontFamily: "var(--font-sofia-sans)",
                            }}
                        >
                            Legal
                        </Typography>
                        <Stack spacing={2}>
                            <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>
                            <Link href="/terms" style={linkStyle}>Terms of Service</Link>
                            <Link href="/refunds" style={linkStyle}>Refund Policy</Link>
                            <Link href="/contact" style={linkStyle}>Contact Us</Link>
                        </Stack>
                    </Grid>

                    {/* Column 4: Need Help? with prefixed icons */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Typography
                            sx={{
                                fontSize: "13px",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "rgba(243, 240, 238, 0.45)",
                                textTransform: "uppercase",
                                mb: 3,
                                fontFamily: "var(--font-sofia-sans)",
                            }}
                        >
                            Need Help?
                        </Typography>
                        <Stack spacing={2.5}>
                            <Box sx={iconLinkStyle}>
                                <ChatBubbleOutlineIcon sx={iconStyle} />
                                <a href={`mailto:${EMAIL}`} style={linkStyle}>hello@elixpo.com</a>
                            </Box>
                            <Box sx={iconLinkStyle}>
                                <CreditCardIcon sx={iconStyle} />
                                <Link href="/contact" style={linkStyle}>Billing Support</Link>
                            </Box>
                            <Box sx={iconLinkStyle}>
                                <MapPinIcon sx={iconStyle} />
                                <span style={textOnlyStyle}>Global Operations</span>
                            </Box>
                            <Box sx={iconLinkStyle}>
                                <HelpOutlineIcon sx={iconStyle} />
                                <Link href="/docs/checkout" style={linkStyle}>Integration FAQ</Link>
                            </Box>
                        </Stack>
                    </Grid>
                </Grid>

                {/* 1px White Divider */}
                <Box
                    sx={{
                        width: "100%",
                        height: "1px",
                        background: "rgba(255, 255, 255, 0.12)",
                        mb: 4,
                    }}
                />

                {/* Bottom Row */}
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                    spacing={3}
                >
                    {/* Copyright & Info */}
                    <Stack spacing={1}>
                        <Typography
                            sx={{
                                fontSize: "14px",
                                color: "rgba(243, 240, 238, 0.6)",
                                fontFamily: "var(--font-sofia-sans)",
                                fontWeight: 450,
                            }}
                        >
                            © {new Date().getFullYear()} Elixpo Pay. All rights reserved.
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "12px",
                                color: "rgba(243, 240, 238, 0.4)",
                                fontFamily: "var(--font-sofia-sans)",
                            }}
                        >
                            Elixpo Pay is payments infrastructure built edge-native on Cloudflare and integrated with global payment processors.
                        </Typography>
                    </Stack>

                    {/* Country Selector Pill and Socials */}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center" sx={{ width: { xs: "100%", md: "auto" } }}>
                        {/* Pill Country/Language Selector */}
                        <Box
                            component="button"
                            onClick={handleLangClick}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                background: "#141413",
                                color: "#FFFFFF",
                                border: "1px solid rgba(255, 255, 255, 0.4)",
                                borderRadius: "999px",
                                px: 2.5,
                                py: 1,
                                fontSize: "14px",
                                cursor: "pointer",
                                fontFamily: "var(--font-sofia-sans)",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    borderColor: "#FFFFFF",
                                    background: "rgba(255, 255, 255, 0.05)",
                                },
                            }}
                        >
                            <span>{language}</span>
                            <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                        </Box>

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => handleLangClose()}
                            PaperProps={{
                                sx: {
                                    background: "#141413",
                                    border: "1px solid rgba(255, 255, 255, 0.15)",
                                    color: "#F3F0EE",
                                },
                            }}
                        >
                            <MenuItem onClick={() => handleLangClose("India (English)")}>India (English)</MenuItem>
                            <MenuItem onClick={() => handleLangClose("United States (English)")}>United States (English)</MenuItem>
                            <MenuItem onClick={() => handleLangClose("Europe (English)")}>Europe (English)</MenuItem>
                            <MenuItem onClick={() => handleLangClose("Global (English)")}>Global (English)</MenuItem>
                        </Menu>

                        {/* Social Icons */}
                        <Stack direction="row" spacing={1.5}>
                            <IconButton
                                component="a"
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={socialIconStyle}
                            >
                                <LinkedInIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                            <IconButton
                                component="a"
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={socialIconStyle}
                            >
                                <FacebookIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                            <IconButton
                                component="a"
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={socialIconStyle}
                            >
                                <TwitterIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                            <IconButton
                                component="a"
                                href="https://youtube.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={socialIconStyle}
                            >
                                <YouTubeIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                        </Stack>
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
};

// Styling definitions
const linkStyle: React.CSSProperties = {
    color: "#F3F0EE",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 450,
    fontFamily: "var(--font-sofia-sans)",
    transition: "opacity 0.2s ease",
};

const textOnlyStyle: React.CSSProperties = {
    color: "rgba(243, 240, 238, 0.6)",
    fontSize: "14px",
    fontWeight: 450,
    fontFamily: "var(--font-sofia-sans)",
};

const iconLinkStyle = {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
};

const iconStyle = {
    fontSize: 18,
    color: "rgba(243, 240, 238, 0.45)",
};

const socialIconStyle = {
    color: "rgba(243, 240, 238, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    width: 38,
    height: 38,
    "&:hover": {
        color: "#FFFFFF",
        borderColor: "#FFFFFF",
        background: "rgba(255,255,255,0.08)",
    },
};

export default Footer;
