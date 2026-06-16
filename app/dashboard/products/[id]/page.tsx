"use client";

export const runtime = "edge";

import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LaunchIcon from "@mui/icons-material/Launch";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatMoney, GlassCard, StatCard } from "@/components/dashboard-ui";

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const INTERVALS = ["day", "week", "month", "year"];

export default function ProductDetailPage() {
    const id = String(useParams().id);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [tierDlg, setTierDlg] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const load = async () => {
        const r = await fetch(`/api/dashboard/products/${id}`, { credentials: "include" });
        if (!r.ok) {
            setData(null);
            setLoading(false);
            return;
        }
        setData(await r.json());
        setLoading(false);
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const addTier = async (form: any) => {
        setBusy(true);
        setErr("");
        try {
            const r = await fetch("/api/dashboard/prices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    product_id: id,
                    nickname: form.nickname || null,
                    currency: form.currency,
                    unit_amount: Math.round(parseFloat(form.major) * 100),
                    interval: form.interval,
                    interval_count: Number(form.interval_count) || 1,
                    region: form.region || null,
                }),
            });
            const d: any = await r.json();
            if (!r.ok) throw new Error(d.error_description || d.error);
            setTierDlg(false);
            await load();
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const toggleTier = async (priceId: string, active: boolean) => {
        await fetch(`/api/dashboard/prices/${priceId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ active }),
        });
        await load();
    };

    const archive = async () => {
        await fetch(`/api/dashboard/products/${id}`, { method: "DELETE", credentials: "include" });
        router.push("/dashboard/products");
    };

    if (loading) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", py: 12 }}>
                <CircularProgress sx={{ color: "#9b7bf7" }} />
            </Box>
        );
    }
    if (!data) {
        return (
            <GlassCard sx={{ textAlign: "center", py: 6 }}>
                <Typography sx={{ color: "rgba(245,245,244,0.6)" }}>Product not found.</Typography>
                <Button component={Link} href="/dashboard/products" sx={{ mt: 2, textTransform: "none", color: "#9b7bf7" }}>
                    ← Back to products
                </Button>
            </GlassCard>
        );
    }

    const { product, prices, stats } = data;
    const primary = stats.revenue?.[0];

    return (
        <Box>
            <Button
                component={Link}
                href="/dashboard/products"
                startIcon={<ArrowBackIcon sx={{ fontSize: "1rem !important" }} />}
                sx={{ textTransform: "none", color: "rgba(245,245,244,0.6)", mb: 2, px: 0, "&:hover": { color: "#fff", background: "transparent" } }}
            >
                Products
            </Button>

            {/* Header */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography sx={{ fontWeight: 800, fontSize: "1.7rem", letterSpacing: "-0.02em" }}>
                            {product.name}
                        </Typography>
                        <Chip
                            label={product.active ? "Active" : "Archived"}
                            size="small"
                            sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                color: product.active ? "#4ade80" : "#9ca3af",
                                bgcolor: product.active ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
                                border: `1px solid ${product.active ? "rgba(34,197,94,0.25)" : "rgba(156,163,175,0.2)"}`,
                            }}
                        />
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.6 }} flexWrap="wrap">
                        <Typography sx={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.8rem", color: "#c4b5fd" }}>
                            Client ID: {product.client_id}
                        </Typography>
                        {product.homepage_url && (
                            <Box component="a" href={product.homepage_url} target="_blank" rel="noopener noreferrer" sx={linkSx}>
                                <LaunchIcon sx={{ fontSize: 13 }} /> Homepage
                            </Box>
                        )}
                        {product.pricing_url && (
                            <Box component="a" href={product.pricing_url} target="_blank" rel="noopener noreferrer" sx={linkSx}>
                                <LaunchIcon sx={{ fontSize: 13 }} /> Pricing page
                            </Box>
                        )}
                    </Stack>
                    {product.description && (
                        <Typography sx={{ color: "rgba(245,245,244,0.55)", fontSize: "0.9rem", mt: 1, maxWidth: 620 }}>
                            {product.description}
                        </Typography>
                    )}
                </Box>
                {product.active === 1 && (
                    <Button
                        onClick={archive}
                        sx={{ textTransform: "none", fontWeight: 600, color: "rgba(248,113,113,0.85)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", px: 2 }}
                    >
                        Archive
                    </Button>
                )}
            </Stack>

            {/* Stats */}
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, mb: 3 }}>
                <StatCard label="Revenue" value={primary ? formatMoney(primary.total, primary.currency) : "—"} sub={stats.revenue.length > 1 ? `+${stats.revenue.length - 1} more currency` : "captured"} accent="#86efac" />
                <StatCard label="Active members" value={String(stats.activeMembers)} sub="entitlements live" accent="#9b7bf7" />
                <StatCard label="Paid txns" value={String(stats.paidTransactions)} sub="lifetime" accent="#fbbf24" />
            </Box>

            {/* Pricing tiers */}
            <GlassCard>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>Pricing tiers</Typography>
                        <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.82rem" }}>
                            Exposed to your app via the catalog API below.
                        </Typography>
                    </Box>
                    <Button
                        startIcon={<AddIcon sx={{ fontSize: "1rem !important" }} />}
                        onClick={() => {
                            setErr("");
                            setTierDlg(true);
                        }}
                        sx={{ textTransform: "none", fontWeight: 600, color: "#fff", px: 2, py: 0.8, borderRadius: "10px", background: "#7c5cff", "&:hover": { background: "#8a6dff" } }}
                    >
                        Add tier
                    </Button>
                </Stack>

                {prices.length === 0 ? (
                    <Typography sx={{ color: "rgba(245,245,244,0.45)", fontSize: "0.9rem", py: 2 }}>
                        No tiers yet — add one so this product can be sold.
                    </Typography>
                ) : (
                    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(230px, 1fr))" } }}>
                        {prices.map((pr: any) => (
                            <Box
                                key={pr.id}
                                sx={{
                                    p: 2,
                                    borderRadius: "12px",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    background: "rgba(255,255,255,0.02)",
                                    opacity: pr.active ? 1 : 0.5,
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Typography sx={{ fontWeight: 600, fontSize: "0.92rem", color: "#f5f5f4" }}>
                                        {pr.nickname || "Tier"}
                                    </Typography>
                                    <Switch size="small" checked={!!pr.active} onChange={(e) => toggleTier(pr.id, e.target.checked)} />
                                </Stack>
                                <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", mt: 0.3 }}>
                                    {formatMoney(pr.unit_amount, pr.currency)}
                                </Typography>
                                <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.8rem" }}>
                                    per {pr.interval_count > 1 ? `${pr.interval_count} ` : ""}
                                    {pr.interval}
                                    {pr.region ? ` · ${pr.region}` : ""}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </GlassCard>

            {/* Catalog API */}
            <GlassCard sx={{ mt: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "1rem", mb: 1 }}>Share tiers via the catalog API</Typography>
                <Typography sx={{ color: "rgba(245,245,244,0.55)", fontSize: "0.88rem", mb: 1.5 }}>
                    Fetch this product's active tiers from your app to render a pricing page — no secret needed.
                </Typography>
                <Box sx={{ ...mono, color: "#c4b5fd" }}>
                    GET https://payouts.elixpo.com/v1/catalog?app={product.client_id}
                </Box>
            </GlassCard>

            <TierDialog open={tierDlg} busy={busy} err={err} onClose={() => setTierDlg(false)} onSubmit={addTier} />
        </Box>
    );
}

function TierDialog({ open, busy, err, onClose, onSubmit }: any) {
    const [nickname, setNickname] = useState("");
    const [currency, setCurrency] = useState("INR");
    const [major, setMajor] = useState("");
    const [interval, setIntervalVal] = useState("month");
    const [intervalCount, setIntervalCount] = useState("1");
    const [region, setRegion] = useState("");

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: dialogPaper }}>
            <DialogTitle sx={{ fontWeight: 700 }}>Add pricing tier</DialogTitle>
            <DialogContent>
                <Stack spacing={2.2} sx={{ mt: 1 }}>
                    <TextField label="Tier name" placeholder="Pro" value={nickname} onChange={(e) => setNickname(e.target.value)} sx={field} fullWidth />
                    <Stack direction="row" spacing={2}>
                        <TextField select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} sx={{ ...field, minWidth: 120 }}>
                            {CURRENCIES.map((c) => (
                                <MenuItem key={c} value={c}>{c}</MenuItem>
                            ))}
                        </TextField>
                        <TextField label="Amount" type="number" placeholder="199" value={major} onChange={(e) => setMajor(e.target.value)} helperText="Major units" sx={field} fullWidth />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TextField select label="Interval" value={interval} onChange={(e) => setIntervalVal(e.target.value)} sx={{ ...field, minWidth: 140 }}>
                            {INTERVALS.map((i) => (
                                <MenuItem key={i} value={i}>{i}</MenuItem>
                            ))}
                        </TextField>
                        <TextField label="Count" type="number" value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} sx={{ ...field, minWidth: 100 }} />
                        <TextField label="Region (optional)" placeholder="IN" value={region} onChange={(e) => setRegion(e.target.value)} sx={field} fullWidth />
                    </Stack>
                    {err && <Typography sx={{ color: "#f87171", fontSize: "0.85rem" }}>{err}</Typography>}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} sx={{ textTransform: "none", color: "rgba(255,255,255,0.6)" }}>Cancel</Button>
                <Button
                    disabled={busy || !(parseFloat(major) > 0)}
                    onClick={() => onSubmit({ nickname, currency, major, interval, interval_count: intervalCount, region })}
                    sx={{ textTransform: "none", fontWeight: 700, color: "#fff", px: 2.4, borderRadius: "10px", background: "#7c5cff", "&:hover": { background: "#8a6dff" }, "&.Mui-disabled": { opacity: 0.4, color: "#fff" } }}
                >
                    {busy ? "Adding…" : "Add tier"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

const field = {
    "& .MuiOutlinedInput-root": {
        color: "#e5e7eb",
        background: "rgba(255,255,255,0.02)",
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: "rgba(155,123,247,0.4)" },
        "&.Mui-focused fieldset": { borderColor: "#9b7bf7" },
    },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
};

const mono = {
    fontFamily: "var(--font-geist-mono)",
    fontSize: "0.82rem",
    p: 1.2,
    borderRadius: "10px",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
    overflowX: "auto",
    whiteSpace: "nowrap",
};

const linkSx = {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.4,
    color: "rgba(245,245,244,0.55)",
    fontSize: "0.78rem",
    textDecoration: "none",
    "&:hover": { color: "#c4b5fd" },
};

const dialogPaper = {
    bgcolor: "#14171e",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    color: "#f5f5f4",
    backgroundImage: "none",
};
