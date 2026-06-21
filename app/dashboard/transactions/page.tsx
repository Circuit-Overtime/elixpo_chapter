"use client";

export const runtime = "edge";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
    fmtDate,
    formatMoney,
    GlassCard,
    StatusChip,
} from "@/components/dashboard-ui";

export default function TransactionsPage() {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard/transactions?limit=100", {
            credentials: "include",
        })
            .then((r) => (r.ok ? r.json() : { transactions: [] }))
            .then((d: any) => {
                setRows(d.transactions || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

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
                    Transactions
                </Typography>
                <Typography
                    sx={{
                        color: "rgba(245,245,244,0.55)",
                        fontSize: "0.92rem",
                    }}
                >
                    Every charge across your apps, newest first.
                </Typography>
            </Box>

            <GlassCard>
                {loading ? (
                    <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
                        <CircularProgress sx={{ color: "#9b7bf7" }} />
                    </Box>
                ) : rows.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                        <Typography sx={{ color: "rgba(245,245,244,0.55)" }}>
                            No transactions yet.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ overflowX: "auto" }}>
                        <Box
                            component="table"
                            sx={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: 700,
                            }}
                        >
                            <Box component="thead">
                                <Box
                                    component="tr"
                                    sx={{
                                        "& th": {
                                            textAlign: "left",
                                            py: 1,
                                            px: 1,
                                            fontSize: "0.72rem",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            color: "rgba(245,245,244,0.4)",
                                            fontWeight: 600,
                                        },
                                    }}
                                >
                                    <th>App</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Payment ID</th>
                                    <th>When</th>
                                </Box>
                            </Box>
                            <Box component="tbody">
                                {rows.map((t) => (
                                    <Box
                                        component="tr"
                                        key={t.id}
                                        sx={{
                                            borderTop:
                                                "1px solid rgba(255,255,255,0.06)",
                                            "& td": {
                                                py: 1.3,
                                                px: 1,
                                                fontSize: "0.88rem",
                                            },
                                        }}
                                    >
                                        <td>
                                            <Box
                                                component="span"
                                                sx={{ color: "#c4b5fd" }}
                                            >
                                                {t.app_slug}
                                            </Box>
                                        </td>
                                        <td>
                                            <Box
                                                component="span"
                                                sx={{
                                                    fontFamily:
                                                        "var(--font-geist-mono)",
                                                    color: "rgba(245,245,244,0.7)",
                                                }}
                                            >
                                                {t.uid || "—"}
                                            </Box>
                                        </td>
                                        <td>
                                            <strong>
                                                {formatMoney(
                                                    t.amount,
                                                    t.currency,
                                                )}
                                            </strong>
                                        </td>
                                        <td>
                                            <StatusChip status={t.status} />
                                        </td>
                                        <td>
                                            <Box
                                                component="span"
                                                sx={{
                                                    fontFamily:
                                                        "var(--font-geist-mono)",
                                                    color: "rgba(245,245,244,0.45)",
                                                    fontSize: "0.78rem",
                                                }}
                                            >
                                                {t.provider_payment_id || "—"}
                                            </Box>
                                        </td>
                                        <td>
                                            <Box
                                                component="span"
                                                sx={{
                                                    color: "rgba(245,245,244,0.5)",
                                                }}
                                            >
                                                {fmtDate(t.created_at)}
                                            </Box>
                                        </td>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                )}
            </GlassCard>
        </Box>
    );
}
