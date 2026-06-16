"use client";

import { Box, Chip, Toolbar, Typography } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Link from "next/link";

const ACCENT = "#9b7bf7";

const Navbar = () => (
    <AppBar
        position="sticky"
        elevation={0}
        sx={{
            background: "rgba(15, 17, 23, 0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            zIndex: 1000,
        }}
    >
        <Toolbar
            sx={{
                maxWidth: "1200px",
                width: "100%",
                mx: "auto",
                px: { xs: 2, md: 4 },
                minHeight: { xs: 60, md: 68 },
            }}
        >
            <Link
                href="/"
                style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexGrow: 1,
                }}
            >
                <Box
                    sx={{
                        height: 30,
                        width: 30,
                        borderRadius: "9px",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        color: "#fff",
                        background:
                            "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        boxShadow: "0 4px 14px rgba(155,123,247,0.35)",
                    }}
                >
                    ₹
                </Box>
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontSize: "1.15rem",
                        color: "#f4f4f6",
                        letterSpacing: "-0.01em",
                    }}
                >
                    Elixpo{" "}
                    <Box component="span" sx={{ color: ACCENT }}>
                        Pay
                    </Box>
                </Typography>
                <Chip
                    label="PAYMENTS"
                    size="small"
                    sx={{
                        bgcolor: "rgba(155, 123, 247, 0.12)",
                        color: ACCENT,
                        fontSize: "10px",
                        height: "22px",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        border: "1px solid rgba(155, 123, 247, 0.3)",
                    }}
                />
            </Link>
        </Toolbar>
    </AppBar>
);

export default Navbar;
