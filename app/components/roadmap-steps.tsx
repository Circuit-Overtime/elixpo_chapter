"use client";

import type { SvgIconComponent } from "@mui/icons-material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BoltIcon from "@mui/icons-material/Bolt";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";

interface Step {
    icon: SvgIconComponent;
    n: string;
    t: string;
    d: string;
    accent: string;
    href: string;
}

const STEPS: Step[] = [
    {
        icon: VpnKeyIcon,
        n: "01",
        t: "Connect your product",
        d: "Register your product, get your client ID + secret key, and sync pricing from code.",
        accent: "#9b7bf7",
        href: "/docs/quickstart",
    },
    {
        icon: AccountBalanceIcon,
        n: "02",
        t: "Set up payouts",
        d: "Connect your bank — every payment is split to you automatically, minus a small fee.",
        accent: "#86efac",
        href: "/docs/payouts",
    },
    {
        icon: BoltIcon,
        n: "03",
        t: "Go live",
        d: "Drop in the hosted checkout and receive signed entitlement webhooks. That's it.",
        accent: "#fbbf24",
        href: "/docs/checkout",
    },
];

export default function RoadmapSteps() {
    return (
        <Box sx={{ py: { xs: 6, md: 9 }, position: "relative" }}>
            <Container maxWidth="md">
                <Typography
                    sx={{
                        textAlign: "center",
                        color: "#b69aff",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        mb: 1,
                    }}
                >
                    Get started
                </Typography>
                <Typography
                    sx={{
                        textAlign: "center",
                        fontWeight: 800,
                        fontSize: { xs: "1.7rem", md: "2.3rem" },
                        letterSpacing: "-0.02em",
                        color: "#f5f5f4",
                    }}
                >
                    Live in three steps
                </Typography>
                <Typography
                    sx={{
                        textAlign: "center",
                        color: "rgba(245,245,244,0.55)",
                        fontSize: "0.95rem",
                        mt: 1,
                    }}
                >
                    Connect, get paid to your own bank, go live — every step is in the docs.
                </Typography>

                <Box sx={{ position: "relative", mt: { xs: 4, md: 7 } }}>
                    {/* wavy roadmap line (desktop) */}
                    <Box
                        component="svg"
                        viewBox="0 0 1000 54"
                        preserveAspectRatio="none"
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: "8%",
                            width: "84%",
                            height: 56,
                            display: { xs: "none", md: "block" },
                            overflow: "visible",
                            zIndex: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="rm-grad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#9b7bf7" />
                                <stop offset="50%" stopColor="#86efac" />
                                <stop offset="100%" stopColor="#fbbf24" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0 27 C 110 4, 230 4, 333 27 S 560 50, 666 27 S 880 4, 1000 27"
                            fill="none"
                            stroke="url(#rm-grad)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray="1 13"
                            opacity="0.65"
                        />
                    </Box>

                    {/* nodes */}
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={{ xs: 4, md: 2 }}
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ position: "relative", zIndex: 1 }}
                    >
                        {STEPS.map((s) => (
                            <Stack
                                key={s.n}
                                component={Link}
                                href={s.href}
                                alignItems="center"
                                spacing={1.4}
                                sx={{
                                    flex: 1,
                                    textAlign: "center",
                                    maxWidth: { xs: "100%", md: 240 },
                                    mx: "auto",
                                    textDecoration: "none",
                                    transition: "transform 0.18s ease",
                                    "&:hover": { transform: "translateY(-3px)" },
                                    "&:hover .rm-node": { borderColor: `${s.accent}aa` },
                                }}
                            >
                                <Box
                                    className="rm-node"
                                    sx={{
                                        width: 54,
                                        height: 54,
                                        borderRadius: "50%",
                                        display: "grid",
                                        placeItems: "center",
                                        color: s.accent,
                                        background: "#0e1117",
                                        border: `1px solid ${s.accent}55`,
                                        boxShadow: `0 0 0 6px rgba(11,13,18,1), 0 8px 24px ${s.accent}33`,
                                        transition: "border-color 0.18s ease",
                                    }}
                                >
                                    <s.icon sx={{ fontSize: 24 }} />
                                </Box>
                                <Stack direction="row" spacing={0.8} alignItems="center">
                                    <Typography
                                        sx={{
                                            fontFamily: "var(--font-geist-mono)",
                                            fontSize: "0.8rem",
                                            fontWeight: 700,
                                            color: s.accent,
                                        }}
                                    >
                                        {s.n}
                                    </Typography>
                                    <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "#f5f5f4" }}>
                                        {s.t}
                                    </Typography>
                                </Stack>
                                <Typography sx={{ color: "rgba(245,245,244,0.6)", fontSize: "0.88rem", lineHeight: 1.55 }}>
                                    {s.d}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>

                {/* Dotted, optional 4th step — email */}
                <Stack
                    component="a"
                    href="https://mail.elixpo.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    direction="row"
                    spacing={1.6}
                    alignItems="center"
                    sx={{
                        mt: { xs: 4, md: 6 },
                        mx: "auto",
                        maxWidth: 560,
                        p: 2,
                        borderRadius: "16px",
                        border: "1.5px dashed rgba(155,123,247,0.4)",
                        background: "rgba(155,123,247,0.04)",
                        textDecoration: "none",
                        transition: "border-color 0.18s ease, background 0.18s ease",
                        "&:hover": { borderColor: "rgba(155,123,247,0.7)", background: "rgba(155,123,247,0.08)" },
                    }}
                >
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: "12px",
                            flexShrink: 0,
                            display: "grid",
                            placeItems: "center",
                            color: "#c4b5fd",
                            border: "1.5px dashed rgba(155,123,247,0.5)",
                        }}
                    >
                        <MailOutlineIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontWeight: 700, color: "#f5f5f4" }}>
                                Optional · Send the emails too
                            </Typography>
                        </Stack>
                        <Typography sx={{ color: "rgba(245,245,244,0.6)", fontSize: "0.86rem" }}>
                            Receipts and event emails with WYSIWYG templates — try{" "}
                            <Box component="span" sx={{ color: "#c4b5fd" }}>mail.elixpo.com</Box>.
                        </Typography>
                    </Box>
                </Stack>

                <Stack alignItems="center" sx={{ mt: 4 }}>
                    <Button
                        component={Link}
                        href="/docs"
                        startIcon={<MenuBookIcon sx={{ fontSize: "1.1rem !important" }} />}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#f5f5f4",
                            px: 3,
                            py: 1.1,
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,0.14)",
                            "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
                        }}
                    >
                        Read the docs
                    </Button>
                </Stack>
            </Container>
        </Box>
    );
}
