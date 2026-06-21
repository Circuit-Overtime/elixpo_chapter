"use client";

export const runtime = "edge";

import { GlassCard, formatMoney } from "@/components/dashboard-ui";
import LaunchIcon from "@mui/icons-material/Launch";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

const SYMBOLS: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
};

function rateLabel(rate: any): string {
    if (!rate) return "—";
    const per =
        rate.interval_count > 1
            ? `every ${rate.interval_count} ${rate.interval}s`
            : { day: "day", week: "week", month: "month", year: "year" }[
                  rate.interval as string
              ] || rate.interval;
    return `${formatMoney(rate.amount, rate.currency)} / ${per}`;
}

function fmtDate(s?: string | null): string {
    if (!s) return "—";
    const d = new Date(`${s.replace(" ", "T")}Z`);
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function SubscriptionsPage() {
    const [loading, setLoading] = useState(true);
    const [subs, setSubs] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/account/subscriptions", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : { subscriptions: [] }))
            .then((d: any) => setSubs(d.subscriptions || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", py: 12 }}>
                <CircularProgress sx={{ color: "#9b7bf7" }} />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography
                    sx={{
                        fontWeight: 800,
                        fontSize: "1.7rem",
                        letterSpacing: "-0.02em",
                    }}
                >
                    My subscriptions
                </Typography>
                <Typography
                    sx={{
                        color: "rgba(245,245,244,0.55)",
                        fontSize: "0.92rem",
                    }}
                >
                    What you're paying for across every app powered by Elixpo
                    Pay.
                </Typography>
            </Box>

            {subs.length === 0 ? (
                <GlassCard sx={{ textAlign: "center", py: 6 }}>
                    <Typography
                        sx={{ fontWeight: 700, fontSize: "1.1rem", mb: 1 }}
                    >
                        No active subscriptions
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.55)",
                            fontSize: "0.9rem",
                        }}
                    >
                        When you subscribe to a product that uses Elixpo Pay,
                        it'll show up here with its rate and renewal date.
                    </Typography>
                </GlassCard>
            ) : (
                <Stack spacing={2}>
                    {subs.map((s) => (
                        <GlassCard
                            key={s.id}
                            sx={{ opacity: s.active ? 1 : 0.6 }}
                        >
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                spacing={1.5}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        flexWrap="wrap"
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: "1.1rem",
                                                color: "#f5f5f4",
                                            }}
                                        >
                                            {s.app_name}
                                        </Typography>
                                        <Chip
                                            label={s.tier}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                fontSize: "0.66rem",
                                                fontWeight: 700,
                                                color: "#c4b5fd",
                                                bgcolor:
                                                    "rgba(155,123,247,0.12)",
                                                border: "1px solid rgba(155,123,247,0.25)",
                                            }}
                                        />
                                        <Chip
                                            label={
                                                s.active ? "Active" : s.status
                                            }
                                            size="small"
                                            sx={{
                                                height: 20,
                                                fontSize: "0.62rem",
                                                fontWeight: 700,
                                                color: s.active
                                                    ? "#86efac"
                                                    : "#9ca3af",
                                                bgcolor: s.active
                                                    ? "rgba(134,239,172,0.12)"
                                                    : "rgba(156,163,175,0.12)",
                                                border: `1px solid ${s.active ? "rgba(134,239,172,0.3)" : "rgba(156,163,175,0.25)"}`,
                                            }}
                                        />
                                    </Stack>
                                    <Typography
                                        sx={{
                                            color: "rgba(245,245,244,0.6)",
                                            fontSize: "0.86rem",
                                            mt: 0.6,
                                        }}
                                    >
                                        {s.product_name || s.tier}
                                        {s.homepage_url && (
                                            <Box
                                                component="a"
                                                href={s.homepage_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    ml: 1,
                                                    color: "#9b7bf7",
                                                    textDecoration: "none",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 0.3,
                                                    "&:hover": {
                                                        textDecoration:
                                                            "underline",
                                                    },
                                                }}
                                            >
                                                <LaunchIcon
                                                    sx={{ fontSize: 13 }}
                                                />{" "}
                                                Manage
                                            </Box>
                                        )}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: "rgba(245,245,244,0.45)",
                                            fontSize: "0.78rem",
                                            mt: 0.5,
                                        }}
                                    >
                                        {s.active
                                            ? `Renews / expires ${fmtDate(s.current_period_end)}`
                                            : s.current_period_end
                                              ? `Ended ${fmtDate(s.current_period_end)}`
                                              : ""}
                                        {s.billing_mode === "one_time"
                                            ? " · renew manually"
                                            : ""}
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        textAlign: { xs: "left", sm: "right" },
                                        flexShrink: 0,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: 800,
                                            fontSize: "1.15rem",
                                            color: "#f5f5f4",
                                        }}
                                    >
                                        {rateLabel(s.rate)}
                                    </Typography>
                                    {s.rate?.nickname && (
                                        <Typography
                                            sx={{
                                                color: "rgba(245,245,244,0.45)",
                                                fontSize: "0.74rem",
                                            }}
                                        >
                                            {s.rate.nickname}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </GlassCard>
                    ))}
                </Stack>
            )}
        </Box>
    );
}
