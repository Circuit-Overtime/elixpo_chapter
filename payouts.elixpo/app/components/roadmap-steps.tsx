"use client";

import type { SvgIconComponent } from "@mui/icons-material";
import BoltIcon from "@mui/icons-material/Bolt";
import LoginIcon from "@mui/icons-material/Login";
import SellIcon from "@mui/icons-material/Sell";
import { Box, Container, Stack, Typography } from "@mui/material";

interface Step {
    icon: SvgIconComponent;
    n: string;
    t: string;
    d: string;
    accent: string;
}

const STEPS: Step[] = [
    {
        icon: LoginIcon,
        n: "01",
        t: "Connect",
        d: "Sign in with Elixpo Accounts and add your provider keys.",
        accent: "#9b7bf7",
    },
    {
        icon: SellIcon,
        n: "02",
        t: "List",
        d: "Define products and regional pricing — dashboard or API.",
        accent: "#86efac",
    },
    {
        icon: BoltIcon,
        n: "03",
        t: "Collect",
        d: "Hosted checkout, signed grants, and automated payouts.",
        accent: "#fbbf24",
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
                            <linearGradient
                                id="rm-grad"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="0"
                            >
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
                                alignItems="center"
                                spacing={1.4}
                                sx={{
                                    flex: 1,
                                    textAlign: "center",
                                    maxWidth: { xs: "100%", md: 240 },
                                    mx: "auto",
                                }}
                            >
                                <Box
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
                                    }}
                                >
                                    <s.icon sx={{ fontSize: 24 }} />
                                </Box>
                                <Stack
                                    direction="row"
                                    spacing={0.8}
                                    alignItems="center"
                                >
                                    <Typography
                                        sx={{
                                            fontFamily:
                                                "var(--font-geist-mono)",
                                            fontSize: "0.8rem",
                                            fontWeight: 700,
                                            color: s.accent,
                                        }}
                                    >
                                        {s.n}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: "1.05rem",
                                            color: "#f5f5f4",
                                        }}
                                    >
                                        {s.t}
                                    </Typography>
                                </Stack>
                                <Typography
                                    sx={{
                                        color: "rgba(245,245,244,0.6)",
                                        fontSize: "0.88rem",
                                        lineHeight: 1.55,
                                    }}
                                >
                                    {s.d}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            </Container>
        </Box>
    );
}
