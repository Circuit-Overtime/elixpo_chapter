"use client";

export const runtime = "edge";

import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/dashboard-ui";

function slugPreview(name: string): string {
    return (
        name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 38) || "app"
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

export default function DevelopersPage() {
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dlg, setDlg] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [newKey, setNewKey] = useState<{ clientId: string; secret: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [secretHidden, setSecretHidden] = useState(false);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [homepageUrl, setHomepageUrl] = useState("");
    const [pricingUrl, setPricingUrl] = useState("");

    const load = async () => {
        const a: any = await fetch("/api/dashboard/apps", { credentials: "include" }).then((r) => r.json());
        setApps(a.apps || []);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const createApp = async () => {
        setBusy(true);
        setErr("");
        try {
            const r = await fetch("/api/dashboard/apps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name,
                    description: description || null,
                    homepage_url: homepageUrl || null,
                    pricing_url: pricingUrl || null,
                }),
            });
            const d: any = await r.json();
            if (!r.ok) throw new Error(d.error_description || d.error);
            setDlg(false);
            setName("");
            setDescription("");
            setHomepageUrl("");
            setPricingUrl("");
            setCopied(false);
            setSecretHidden(false);
            setNewKey({ clientId: d.client_id, secret: d.client_secret });
            await load();
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    const copyKey = async () => {
        if (!newKey) return;
        try {
            await navigator.clipboard.writeText(newKey.secret);
            setCopied(true);
            // Once copied, hide the secret for good — it's never shown again.
            setSecretHidden(true);
        } catch {
            // ignore
        }
    };

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
                        Developers
                    </Typography>
                    <Typography sx={{ color: "rgba(245,245,244,0.55)", fontSize: "0.92rem" }}>
                        Your apps, API keys, and integration details.
                    </Typography>
                </Box>
                <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                        setErr("");
                        setDlg(true);
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
                    }}
                >
                    New app
                </Button>
            </Stack>

            {newKey && (
                <GlassCard sx={{ mb: 3, border: "1px solid rgba(134,239,172,0.35)" }}>
                    <Typography sx={{ fontWeight: 700, color: "#86efac", mb: 1.2 }}>
                        App created — copy your client secret now
                    </Typography>

                    {/* Client ID (public, always visible) */}
                    <Typography sx={{ fontSize: "0.72rem", color: "rgba(245,245,244,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                        Client ID
                    </Typography>
                    <Box
                        sx={{
                            fontFamily: "var(--font-geist-mono)",
                            fontSize: "0.85rem",
                            p: 1.2,
                            mb: 2,
                            borderRadius: "10px",
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#c4b5fd",
                        }}
                    >
                        {newKey.clientId}
                    </Box>

                    {/* Client secret (shown once, hidden after copy) */}
                    <Typography sx={{ fontSize: "0.72rem", color: "rgba(245,245,244,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                        Client secret
                    </Typography>
                    {secretHidden ? (
                        <Box
                            sx={{
                                p: 1.2,
                                borderRadius: "10px",
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "rgba(245,245,244,0.45)",
                                fontSize: "0.85rem",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <CheckCircleIcon sx={{ fontSize: 16, color: "#86efac" }} />
                            Copied & hidden — for your security it won't be shown again. Store it as{" "}
                            <Box component="code" sx={codeSx}>ELIXPO_PAY_API_KEY</Box>.
                        </Box>
                    ) : (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                                sx={{
                                    flexGrow: 1,
                                    fontFamily: "var(--font-geist-mono)",
                                    fontSize: "0.85rem",
                                    p: 1.2,
                                    borderRadius: "10px",
                                    background: "rgba(0,0,0,0.3)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    overflowX: "auto",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {newKey.secret}
                            </Box>
                            <Button
                                onClick={copyKey}
                                startIcon={<ContentCopyIcon sx={{ fontSize: "1rem !important" }} />}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    color: "#fff",
                                    px: 2,
                                    background: "#7c5cff",
                                    borderRadius: "10px",
                                    "&:hover": { background: "#8a6dff" },
                                }}
                            >
                                Copy
                            </Button>
                        </Stack>
                    )}
                </GlassCard>
            )}

            {loading ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
                    <CircularProgress sx={{ color: "#9b7bf7" }} />
                </Box>
            ) : apps.length === 0 ? (
                <GlassCard sx={{ textAlign: "center", py: 6 }}>
                    <Typography sx={{ color: "rgba(245,245,244,0.55)" }}>
                        No apps yet. Create one to get an API key and start accepting payments.
                    </Typography>
                </GlassCard>
            ) : (
                <Stack spacing={2}>
                    {apps.map((a) => (
                        <GlassCard key={a.id}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                <Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>{a.name}</Typography>
                                        <Chip
                                            label={a.slug}
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
                                    <Typography sx={{ color: "rgba(245,245,244,0.45)", fontSize: "0.82rem", mt: 0.5, fontFamily: "var(--font-geist-mono)" }}>
                                        {a.id} · {a.products} product{a.products === 1 ? "" : "s"} · key {a.has_key ? "set" : "—"}
                                    </Typography>
                                </Box>
                                <Button
                                    component={Link}
                                    href="/dashboard/products"
                                    size="small"
                                    sx={{ textTransform: "none", color: "#c4b5fd", fontWeight: 600 }}
                                >
                                    Manage products →
                                </Button>
                            </Stack>
                        </GlassCard>
                    ))}
                </Stack>
            )}

            <Stack alignItems="center" sx={{ mt: 4 }}>
                <Button
                    component={Link}
                    href="/docs/quickstart"
                    startIcon={<MenuBookIcon sx={{ fontSize: "1.1rem !important" }} />}
                    sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: "#f5f5f4",
                        px: 3,
                        py: 1.2,
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.14)",
                        "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
                    }}
                >
                    Read Integration Docs
                </Button>
            </Stack>

            <Dialog open={dlg} onClose={() => setDlg(false)} fullWidth maxWidth="sm" PaperProps={{ sx: dialogPaper }}>
                <DialogTitle sx={{ fontWeight: 700 }}>New app</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.2} sx={{ mt: 1 }}>
                        <TextField
                            label="App name"
                            placeholder="My App"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            helperText={
                                name.trim().length >= 2
                                    ? `API id (slug): ${slugPreview(name)} — used in the checkout handoff and /v1/entitlements`
                                    : "Shown to buyers at checkout; we derive a stable API slug from it"
                            }
                            sx={field}
                            fullWidth
                        />
                        <TextField label="Description" placeholder="What this app sells" multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} sx={field} fullWidth />
                        <TextField label="Homepage URL" placeholder="https://myapp.com" value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} sx={field} fullWidth />
                        <TextField label="Pricing page URL" placeholder="https://myapp.com/pricing" helperText="Where buyers return after checkout" value={pricingUrl} onChange={(e) => setPricingUrl(e.target.value)} sx={field} fullWidth />
                        {err && <Typography sx={{ color: "#f87171", fontSize: "0.85rem" }}>{err}</Typography>}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setDlg(false)} sx={{ textTransform: "none", color: "rgba(255,255,255,0.6)" }}>
                        Cancel
                    </Button>
                    <Button
                        disabled={busy || name.trim().length < 2}
                        onClick={createApp}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#fff",
                            px: 2.4,
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                            "&.Mui-disabled": { opacity: 0.4, color: "#fff" },
                        }}
                    >
                        {busy ? "Creating…" : "Create app"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

const codeSx = {
    fontFamily: "var(--font-geist-mono)",
    fontSize: "0.82rem",
    px: 0.6,
    py: 0.2,
    borderRadius: "6px",
    background: "rgba(155,123,247,0.12)",
    color: "#c4b5fd",
};

const dialogPaper = {
    bgcolor: "rgba(17,21,28,0.97)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    color: "#f5f5f4",
    backgroundImage: "none",
};
