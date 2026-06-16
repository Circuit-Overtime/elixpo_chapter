"use client";

export const runtime = "edge";

import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
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
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/confirm-dialog";
import { formatMoney, GlassCard, StatCard } from "@/components/dashboard-ui";

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const INTERVALS = ["day", "week", "month", "year"];

export default function ProductDetailPage() {
    const id = String(useParams().id);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [tierDlg, setTierDlg] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [creds, setCreds] = useState<{ clientId: string; secret: string } | null>(null);
    const [secretHidden, setSecretHidden] = useState(false);
    const [regenBusy, setRegenBusy] = useState(false);
    const [confirmArchive, setConfirmArchive] = useState(false);
    const [confirmRegen, setConfirmRegen] = useState(false);
    const [archiveBusy, setArchiveBusy] = useState(false);
    const [webhook, setWebhook] = useState<any>(null);
    const [webhookUrl, setWebhookUrl] = useState("");
    const [availableEvents, setAvailableEvents] = useState<any[]>([]);
    const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
    const [webhookSecretOnce, setWebhookSecretOnce] = useState<string | null>(null);
    const [webhookSecretHidden, setWebhookSecretHidden] = useState(false);
    const [webhookBusy, setWebhookBusy] = useState(false);
    const [confirmWebhookRegen, setConfirmWebhookRegen] = useState(false);

    const copyWebhookSecret = async () => {
        if (!webhookSecretOnce) return;
        try {
            await navigator.clipboard.writeText(webhookSecretOnce);
            setWebhookSecretHidden(true);
        } catch {
            // ignore
        }
    };

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

    const loadWebhook = async () => {
        const r = await fetch(`/api/dashboard/products/${id}/webhook`, { credentials: "include" });
        if (!r.ok) return;
        const d: any = await r.json();
        setWebhook(d.endpoint);
        setWebhookUrl(d.endpoint?.url || "");
        setAvailableEvents(d.available_events || []);
        setWebhookEvents(
            d.endpoint?.events ||
                (d.available_events || []).filter((e: any) => e.required).map((e: any) => e.type),
        );
    };

    const toggleWebhookEvent = (type: string, on: boolean) => {
        setWebhookEvents((prev) =>
            on ? [...new Set([...prev, type])] : prev.filter((t) => t !== type),
        );
    };

    const saveWebhook = async () => {
        setWebhookBusy(true);
        setErr("");
        try {
            const r = await fetch(`/api/dashboard/products/${id}/webhook`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ url: webhookUrl.trim(), events: webhookEvents }),
            });
            const d: any = await r.json();
            if (!r.ok) throw new Error(d.error_description || d.error || "failed");
            if (d.signing_secret) {
                setWebhookSecretHidden(false);
                setWebhookSecretOnce(d.signing_secret);
            }
            await loadWebhook();
        } catch (e: any) {
            setErr(e?.message || "Could not save webhook");
        } finally {
            setWebhookBusy(false);
        }
    };

    const regenWebhookSecret = async () => {
        setWebhookBusy(true);
        setErr("");
        try {
            const r = await fetch(`/api/dashboard/products/${id}/webhook`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            const d: any = await r.json();
            if (!r.ok) throw new Error(d.error_description || d.error || "failed");
            setWebhookSecretHidden(false);
            setWebhookSecretOnce(d.signing_secret);
            await loadWebhook();
        } catch (e: any) {
            setErr(e?.message || "Could not regenerate secret");
        } finally {
            setWebhookBusy(false);
            setConfirmWebhookRegen(false);
        }
    };

    useEffect(() => {
        load();
        loadWebhook();
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

    const doArchive = async () => {
        setArchiveBusy(true);
        await fetch(`/api/dashboard/products/${id}`, { method: "DELETE", credentials: "include" });
        setArchiveBusy(false);
        setConfirmArchive(false);
        await load();
    };

    const doUnarchive = async () => {
        setArchiveBusy(true);
        await fetch(`/api/dashboard/products/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ active: true }),
        });
        setArchiveBusy(false);
        await load();
    };

    const doRegenerate = async () => {
        setRegenBusy(true);
        setErr("");
        try {
            const r = await fetch(`/api/dashboard/products/${id}/regenerate-secret`, {
                method: "POST",
                credentials: "include",
            });
            const d: any = await r.json();
            if (!r.ok) throw new Error(d.error_description || d.error || "failed");
            setSecretHidden(false);
            setCreds({ clientId: d.client_id, secret: d.client_secret });
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setRegenBusy(false);
            setConfirmRegen(false);
        }
    };

    const copySecret = async () => {
        if (!creds) return;
        try {
            await navigator.clipboard.writeText(creds.secret);
            setSecretHidden(true);
        } catch {
            // ignore
        }
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
                {product.active === 1 ? (
                    <Button
                        onClick={() => setConfirmArchive(true)}
                        sx={{ textTransform: "none", fontWeight: 600, color: "rgba(248,113,113,0.85)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", px: 2 }}
                    >
                        Archive
                    </Button>
                ) : (
                    <Button
                        onClick={doUnarchive}
                        disabled={archiveBusy}
                        sx={{ textTransform: "none", fontWeight: 700, color: "#fff", borderRadius: "10px", px: 2.2, background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)", "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" }, "&.Mui-disabled": { opacity: 0.5, color: "#fff" } }}
                    >
                        {archiveBusy ? "Unarchiving…" : "Unarchive"}
                    </Button>
                )}
            </Stack>

            {product.active !== 1 && (
                <Box
                    sx={{
                        mb: 3,
                        px: 2,
                        py: 1.4,
                        borderRadius: "12px",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        color: "rgba(248,113,113,0.9)",
                        fontSize: "0.88rem",
                    }}
                >
                    <strong>This product is archived — payments are paused.</strong> Checkout
                    can't resolve it and entitlements won't be granted. Click{" "}
                    <strong>Unarchive</strong> to resume.
                </Box>
            )}

            {/* Stats */}
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, mb: 3 }}>
                <StatCard label="Revenue" value={primary ? formatMoney(primary.total, primary.currency) : "—"} sub={stats.revenue.length > 1 ? `+${stats.revenue.length - 1} more currency` : "captured"} accent="#86efac" />
                <StatCard label="Active members" value={String(stats.activeMembers)} sub="entitlements live" accent="#9b7bf7" />
                <StatCard label="Paid txns" value={String(stats.paidTransactions)} sub="lifetime" accent="#fbbf24" />
            </Box>

            {/* Developer credentials */}
            <GlassCard sx={{ mb: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5} sx={{ mb: 1.5 }}>
                    <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>Developer credentials</Typography>
                        <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.82rem" }}>
                            Use the Client ID + secret to call the entitlements API.
                        </Typography>
                    </Box>
                    <Button
                        onClick={() => setConfirmRegen(true)}
                        disabled={regenBusy}
                        startIcon={<AutorenewIcon sx={{ fontSize: "1rem !important" }} />}
                        sx={{ textTransform: "none", fontWeight: 600, color: "#c4b5fd", border: "1px solid rgba(155,123,247,0.3)", borderRadius: "10px", px: 1.8, "&.Mui-disabled": { opacity: 0.5 } }}
                    >
                        {regenBusy ? "Regenerating…" : "Regenerate secret"}
                    </Button>
                </Stack>

                <Typography sx={{ fontSize: "0.7rem", color: "rgba(245,245,244,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                    Client ID
                </Typography>
                <Box sx={{ ...mono, color: "#c4b5fd", mb: creds ? 2 : 0 }}>{product.client_id}</Box>

                {creds && (
                    <>
                        <Typography sx={{ fontSize: "0.7rem", color: "rgba(245,245,244,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                            New client secret
                        </Typography>
                        {secretHidden ? (
                            <Box sx={{ ...mono, display: "flex", alignItems: "center", gap: 1, color: "rgba(245,245,244,0.5)" }}>
                                <CheckCircleIcon sx={{ fontSize: 16, color: "#86efac" }} />
                                Copied & hidden — the old secret no longer works. Store this as ELIXPO_PAY_API_KEY.
                            </Box>
                        ) : (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ ...mono, flexGrow: 1, overflowX: "auto", whiteSpace: "nowrap" }}>{creds.secret}</Box>
                                <Button
                                    onClick={copySecret}
                                    startIcon={<ContentCopyIcon sx={{ fontSize: "1rem !important" }} />}
                                    sx={{ textTransform: "none", fontWeight: 600, color: "#fff", px: 2, background: "#7c5cff", borderRadius: "10px", "&:hover": { background: "#8a6dff" } }}
                                >
                                    Copy
                                </Button>
                            </Stack>
                        )}
                    </>
                )}
                {err && <Typography sx={{ color: "#f87171", fontSize: "0.85rem", mt: 1 }}>{err}</Typography>}
            </GlassCard>

            {/* Entitlement webhook */}
            <GlassCard sx={{ mb: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5} sx={{ mb: 1.5 }}>
                    <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>Entitlement webhook</Typography>
                        <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.82rem" }}>
                            We POST <code>entitlement.updated</code> here after each payment. Your app verifies it with the signing secret.
                        </Typography>
                    </Box>
                    {webhook?.has_secret && (
                        <Button
                            onClick={() => setConfirmWebhookRegen(true)}
                            disabled={webhookBusy}
                            startIcon={<AutorenewIcon sx={{ fontSize: "1rem !important" }} />}
                            sx={{ textTransform: "none", fontWeight: 600, color: "#c4b5fd", border: "1px solid rgba(155,123,247,0.3)", borderRadius: "10px", px: 1.8, "&.Mui-disabled": { opacity: 0.5 } }}
                        >
                            Roll secret
                        </Button>
                    )}
                </Stack>

                <Typography sx={{ fontSize: "0.7rem", color: "rgba(245,245,244,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                    Endpoint URL
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                    <TextField
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://yourapp.com/api/billing/grant"
                        size="small"
                        fullWidth
                        sx={field}
                    />
                    <Button
                        onClick={saveWebhook}
                        disabled={
                            webhookBusy ||
                            !webhookUrl.trim() ||
                            (webhookUrl.trim() === webhook?.url &&
                                JSON.stringify([...webhookEvents].sort()) ===
                                    JSON.stringify([...(webhook?.events || [])].sort()))
                        }
                        sx={{ textTransform: "none", fontWeight: 600, color: "#fff", px: 2.4, py: 0.9, borderRadius: "10px", background: "#7c5cff", whiteSpace: "nowrap", "&:hover": { background: "#8a6dff" }, "&.Mui-disabled": { opacity: 0.5, color: "#fff" } }}
                    >
                        {webhookBusy ? "Saving…" : webhook ? "Update" : "Save"}
                    </Button>
                </Stack>

                {availableEvents.length > 0 && (
                    <Box sx={{ mt: 2.5 }}>
                        <Typography sx={{ fontSize: "0.7rem", color: "rgba(245,245,244,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1 }}>
                            Events to send
                        </Typography>
                        <Stack spacing={1}>
                            {availableEvents.map((ev: any) => {
                                const on = ev.required || webhookEvents.includes(ev.type);
                                return (
                                    <Stack
                                        key={ev.type}
                                        direction="row"
                                        alignItems="flex-start"
                                        justifyContent="space-between"
                                        spacing={1.5}
                                        sx={{ p: 1.4, borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.2 }}>
                                                <Box component="code" sx={{ ...mono, fontSize: "0.8rem", color: "#c4b5fd", p: 0, background: "none", border: "none" }}>
                                                    {ev.type}
                                                </Box>
                                                {ev.required && (
                                                    <Chip label="required" size="small" sx={{ height: 18, fontSize: "0.6rem", color: "rgba(245,245,244,0.6)", bgcolor: "rgba(255,255,255,0.06)" }} />
                                                )}
                                            </Stack>
                                            <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.8rem" }}>
                                                {ev.description}
                                            </Typography>
                                        </Box>
                                        <Switch
                                            size="small"
                                            checked={on}
                                            disabled={ev.required}
                                            onChange={(e) => toggleWebhookEvent(ev.type, e.target.checked)}
                                        />
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Box>
                )}

                {webhookSecretOnce ? (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ fontSize: "0.7rem", color: "rgba(245,245,244,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                            Signing secret — shown once
                        </Typography>
                        {webhookSecretHidden ? (
                            <Box sx={{ ...mono, display: "flex", alignItems: "center", gap: 1, color: "rgba(245,245,244,0.5)" }}>
                                <CheckCircleIcon sx={{ fontSize: 16, color: "#86efac" }} />
                                Copied &amp; hidden — store it as ELIXPO_PAY_WEBHOOK_SECRET. It won't be shown again.
                            </Box>
                        ) : (
                            <>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ ...mono, flexGrow: 1, overflowX: "auto", whiteSpace: "nowrap" }}>{webhookSecretOnce}</Box>
                                    <Button
                                        onClick={copyWebhookSecret}
                                        startIcon={<ContentCopyIcon sx={{ fontSize: "1rem !important" }} />}
                                        sx={{ textTransform: "none", fontWeight: 600, color: "#fff", px: 2, background: "#7c5cff", borderRadius: "10px", "&:hover": { background: "#8a6dff" } }}
                                    >
                                        Copy
                                    </Button>
                                </Stack>
                                <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.78rem", mt: 0.8 }}>
                                    Store this as <code>ELIXPO_PAY_WEBHOOK_SECRET</code> in your app. It won't be shown again.
                                </Typography>
                            </>
                        )}
                    </Box>
                ) : webhook?.secret_preview ? (
                    <Typography sx={{ ...mono, color: "rgba(245,245,244,0.5)", mt: 1.5 }}>
                        Signing secret: {webhook.secret_preview}
                    </Typography>
                ) : null}
            </GlassCard>

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

            <ConfirmDialog
                open={confirmArchive}
                destructive
                busy={archiveBusy}
                title="Archive this product?"
                confirmLabel="Archive product"
                message={
                    <>
                        This <strong>pauses all payments</strong> for{" "}
                        <strong>{product.name}</strong> — checkout stops working and no new
                        entitlements are granted. Existing members keep their access until it
                        expires. You can unarchive anytime to resume.
                    </>
                }
                onConfirm={doArchive}
                onClose={() => setConfirmArchive(false)}
            />

            <ConfirmDialog
                open={confirmRegen}
                destructive
                busy={regenBusy}
                title="Regenerate client secret?"
                confirmLabel="Regenerate secret"
                message={
                    <>
                        The <strong>current secret stops working immediately</strong>. Any
                        integration using it (checkout, entitlements API) will fail until you
                        update it with the new secret.
                    </>
                }
                onConfirm={doRegenerate}
                onClose={() => setConfirmRegen(false)}
            />

            <ConfirmDialog
                open={confirmWebhookRegen}
                destructive
                busy={webhookBusy}
                title="Roll the webhook signing secret?"
                confirmLabel="Roll secret"
                message={
                    <>
                        The <strong>current signing secret stops working immediately</strong>.
                        Your app will reject our <code>entitlement.updated</code> webhooks —
                        and members won't be granted access — until you update{" "}
                        <code>ELIXPO_PAY_WEBHOOK_SECRET</code> with the new value.
                    </>
                }
                onConfirm={regenWebhookSecret}
                onClose={() => setConfirmWebhookRegen(false)}
            />
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
