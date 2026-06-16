"use client";

export const runtime = "edge";

import AddIcon from "@mui/icons-material/Add";
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
import { useEffect, useState } from "react";
import { formatMoney, GlassCard } from "@/components/dashboard-ui";

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const INTERVALS = ["day", "week", "month", "year"];

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

export default function ProductsPage() {
    const [loading, setLoading] = useState(true);
    const [apps, setApps] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const [productDlg, setProductDlg] = useState(false);
    const [priceDlg, setPriceDlg] = useState<string | null>(null); // productId
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const load = async () => {
        const [a, p] = await Promise.all([
            fetch("/api/dashboard/apps", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/dashboard/products", { credentials: "include" }).then((r) => r.json()),
        ]);
        setApps(a.apps || []);
        setProducts(p.products || []);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const createProduct = async (form: { app_id: string; name: string; tier: string; description: string }) => {
        setBusy(true);
        setErr("");
        try {
            const r = await fetch("/api/dashboard/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(form),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error_description || d.error);
            setProductDlg(false);
            await load();
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const createPrice = async (
        productId: string,
        form: { currency: string; major: string; interval: string; interval_count: string; region: string },
    ) => {
        setBusy(true);
        setErr("");
        try {
            const minor = Math.round(parseFloat(form.major) * 100);
            const r = await fetch("/api/dashboard/prices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    product_id: productId,
                    currency: form.currency,
                    unit_amount: minor,
                    interval: form.interval,
                    interval_count: Number(form.interval_count) || 1,
                    region: form.region || null,
                }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error_description || d.error);
            setPriceDlg(null);
            await load();
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const togglePrice = async (priceId: string, active: boolean) => {
        await fetch(`/api/dashboard/prices/${priceId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ active }),
        });
        await load();
    };

    const deactivateProduct = async (productId: string) => {
        await fetch(`/api/dashboard/products/${productId}`, {
            method: "DELETE",
            credentials: "include",
        });
        await load();
    };

    if (loading) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", py: 12 }}>
                <CircularProgress sx={{ color: "#9b7bf7" }} />
            </Box>
        );
    }

    return (
        <Box>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.7rem", letterSpacing: "-0.02em" }}>
                        Products & Pricing
                    </Typography>
                    <Typography sx={{ color: "rgba(245,245,244,0.55)", fontSize: "0.92rem" }}>
                        Define what you sell and the regional price points checkout offers.
                    </Typography>
                </Box>
                <Button
                    startIcon={<AddIcon />}
                    disabled={apps.length === 0}
                    onClick={() => {
                        setErr("");
                        setProductDlg(true);
                    }}
                    sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "#fff",
                        px: 2.2,
                        py: 1,
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
                        "&.Mui-disabled": { opacity: 0.4, color: "#fff" },
                    }}
                >
                    New product
                </Button>
            </Stack>

            {apps.length === 0 && (
                <GlassCard sx={{ textAlign: "center", py: 6 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", mb: 1 }}>
                        Create an app first
                    </Typography>
                    <Typography sx={{ color: "rgba(245,245,244,0.55)", mb: 3, fontSize: "0.9rem" }}>
                        Products belong to an app. Spin one up in Developers to get an API key and start listing plans.
                    </Typography>
                    <Button
                        component={Link}
                        href="/dashboard/developers"
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#fff",
                            px: 2.4,
                            py: 1,
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        }}
                    >
                        Go to Developers
                    </Button>
                </GlassCard>
            )}

            {apps.length > 0 && products.length === 0 && (
                <GlassCard sx={{ textAlign: "center", py: 6 }}>
                    <Typography sx={{ color: "rgba(245,245,244,0.55)" }}>
                        No products yet — click <strong>New product</strong> to add your first listing.
                    </Typography>
                </GlassCard>
            )}

            <Stack spacing={2}>
                {products.map((p) => (
                    <GlassCard key={p.id} sx={{ opacity: p.active ? 1 : 0.55 }}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            spacing={1.5}
                            sx={{ mb: 2 }}
                        >
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
                                        {p.name}
                                    </Typography>
                                    <Chip
                                        label={p.tier}
                                        size="small"
                                        sx={{
                                            height: 22,
                                            fontSize: "0.72rem",
                                            color: "#86efac",
                                            bgcolor: "rgba(134,239,172,0.12)",
                                            border: "1px solid rgba(134,239,172,0.3)",
                                        }}
                                    />
                                    <Chip
                                        label={p.app_slug}
                                        size="small"
                                        sx={{
                                            height: 22,
                                            fontSize: "0.72rem",
                                            color: "#c4b5fd",
                                            bgcolor: "rgba(155,123,247,0.12)",
                                            border: "1px solid rgba(155,123,247,0.3)",
                                        }}
                                    />
                                </Stack>
                                {p.description && (
                                    <Typography sx={{ color: "rgba(245,245,244,0.5)", fontSize: "0.85rem", mt: 0.5 }}>
                                        {p.description}
                                    </Typography>
                                )}
                            </Box>
                            <Stack direction="row" spacing={1}>
                                <Button
                                    size="small"
                                    startIcon={<AddIcon sx={{ fontSize: "1rem !important" }} />}
                                    onClick={() => {
                                        setErr("");
                                        setPriceDlg(p.id);
                                    }}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        color: "#c4b5fd",
                                        border: "1px solid rgba(155,123,247,0.3)",
                                        borderRadius: "8px",
                                        px: 1.5,
                                    }}
                                >
                                    Add price
                                </Button>
                                {p.active === 1 && (
                                    <Button
                                        size="small"
                                        onClick={() => deactivateProduct(p.id)}
                                        sx={{
                                            textTransform: "none",
                                            fontWeight: 600,
                                            color: "rgba(248,113,113,0.8)",
                                            border: "1px solid rgba(239,68,68,0.25)",
                                            borderRadius: "8px",
                                            px: 1.5,
                                        }}
                                    >
                                        Archive
                                    </Button>
                                )}
                            </Stack>
                        </Stack>

                        {p.prices.length === 0 ? (
                            <Typography sx={{ color: "rgba(245,245,244,0.4)", fontSize: "0.85rem", py: 1 }}>
                                No prices — add one so this product can be sold.
                            </Typography>
                        ) : (
                            <Box
                                sx={{
                                    display: "grid",
                                    gap: 1.5,
                                    gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(220px, 1fr))" },
                                }}
                            >
                                {p.prices.map((pr: any) => (
                                    <Box
                                        key={pr.id}
                                        sx={{
                                            p: 1.8,
                                            borderRadius: "12px",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            background: "rgba(255,255,255,0.02)",
                                            opacity: pr.active ? 1 : 0.5,
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography sx={{ fontWeight: 800, fontSize: "1.25rem" }}>
                                                {formatMoney(pr.unit_amount, pr.currency)}
                                            </Typography>
                                            <Switch
                                                size="small"
                                                checked={!!pr.active}
                                                onChange={(e) => togglePrice(pr.id, e.target.checked)}
                                            />
                                        </Stack>
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
                ))}
            </Stack>

            <ProductDialog
                open={productDlg}
                apps={apps}
                busy={busy}
                err={err}
                onClose={() => setProductDlg(false)}
                onSubmit={createProduct}
            />
            <PriceDialog
                open={!!priceDlg}
                busy={busy}
                err={err}
                onClose={() => setPriceDlg(null)}
                onSubmit={(form) => priceDlg && createPrice(priceDlg, form)}
            />
        </Box>
    );
}

function ProductDialog({ open, apps, busy, err, onClose, onSubmit }: any) {
    const [appId, setAppId] = useState("");
    const [name, setName] = useState("");
    const [tier, setTier] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (open && apps.length) setAppId(apps[0].id);
    }, [open, apps]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: dialogPaper }}>
            <DialogTitle sx={{ fontWeight: 700 }}>New product</DialogTitle>
            <DialogContent>
                <Stack spacing={2.2} sx={{ mt: 1 }}>
                    <TextField select label="App" value={appId} onChange={(e) => setAppId(e.target.value)} sx={field} fullWidth>
                        {apps.map((a: any) => (
                            <MenuItem key={a.id} value={a.id}>
                                {a.name} ({a.slug})
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField label="Product name" placeholder="Blogs Member" value={name} onChange={(e) => setName(e.target.value)} sx={field} fullWidth />
                    <TextField label="Tier slug" placeholder="member" helperText="The entitlement tier granted on purchase (a-z 0-9 _)" value={tier} onChange={(e) => setTier(e.target.value)} sx={field} fullWidth />
                    <TextField label="Description" multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} sx={field} fullWidth />
                    {err && <Typography sx={{ color: "#f87171", fontSize: "0.85rem" }}>{err}</Typography>}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} sx={{ textTransform: "none", color: "rgba(255,255,255,0.6)" }}>
                    Cancel
                </Button>
                <Button
                    disabled={busy || !appId || !name || !tier}
                    onClick={() => onSubmit({ app_id: appId, name, tier, description })}
                    sx={primaryBtn}
                >
                    {busy ? "Creating…" : "Create product"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function PriceDialog({ open, busy, err, onClose, onSubmit }: any) {
    const [currency, setCurrency] = useState("INR");
    const [major, setMajor] = useState("");
    const [interval, setInterval] = useState("month");
    const [intervalCount, setIntervalCount] = useState("1");
    const [region, setRegion] = useState("");

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: dialogPaper }}>
            <DialogTitle sx={{ fontWeight: 700 }}>Add price</DialogTitle>
            <DialogContent>
                <Stack spacing={2.2} sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={2}>
                        <TextField select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} sx={{ ...field, minWidth: 120 }}>
                            {CURRENCIES.map((c) => (
                                <MenuItem key={c} value={c}>
                                    {c}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField label="Amount" placeholder="199" type="number" value={major} onChange={(e) => setMajor(e.target.value)} helperText="Major units (e.g. 199 = ₹199.00)" sx={field} fullWidth />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TextField select label="Interval" value={interval} onChange={(e) => setInterval(e.target.value)} sx={{ ...field, minWidth: 140 }}>
                            {INTERVALS.map((i) => (
                                <MenuItem key={i} value={i}>
                                    {i}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField label="Count" type="number" value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} sx={{ ...field, minWidth: 100 }} />
                        <TextField label="Region (optional)" placeholder="IN" value={region} onChange={(e) => setRegion(e.target.value)} sx={field} fullWidth />
                    </Stack>
                    {err && <Typography sx={{ color: "#f87171", fontSize: "0.85rem" }}>{err}</Typography>}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} sx={{ textTransform: "none", color: "rgba(255,255,255,0.6)" }}>
                    Cancel
                </Button>
                <Button
                    disabled={busy || !major}
                    onClick={() => onSubmit({ currency, major, interval, interval_count: intervalCount, region })}
                    sx={primaryBtn}
                >
                    {busy ? "Adding…" : "Add price"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

const dialogPaper = {
    bgcolor: "rgba(17,21,28,0.97)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    color: "#f5f5f4",
    backgroundImage: "none",
};

const primaryBtn = {
    textTransform: "none",
    fontWeight: 700,
    color: "#fff",
    px: 2.4,
    borderRadius: "10px",
    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
    "&.Mui-disabled": { opacity: 0.4, color: "#fff" },
};
