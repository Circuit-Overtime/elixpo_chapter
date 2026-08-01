"use client";

import type { EmailFooter } from "@/lib/render";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BoltIcon from "@mui/icons-material/Bolt";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import WebhookIcon from "@mui/icons-material/Webhook";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GHOST_BTN, PRIMARY_BTN } from "./dashboard-ui";
import GlassCard from "./glass-card";
import TemplateSendDialog from "./template-send-dialog";
import TemplateTestDialog from "./template-test-dialog";

const ACCENT = "#ff7759";
const TEXT = "var(--fg)";
const TEXT_60 = "var(--fg-muted)";

const darkField = {
    "& .MuiOutlinedInput-root": {
        color: TEXT,
        borderRadius: "10px",
        background: "var(--surface-2)",
        "& fieldset": { borderColor: "var(--border)" },
        "&:hover fieldset": { borderColor: "var(--border)" },
        "&.Mui-focused fieldset": { borderColor: ACCENT },
    },
    "& .MuiInputBase-input": { fontSize: "0.88rem", py: 0.8 },
    "& .MuiInputBase-input::placeholder": { color: "var(--fg-faint)", opacity: 1 },
} as const;

const darkSelect = {
    color: TEXT,
    borderRadius: "10px",
    background: "var(--surface-2)",
    fontSize: "0.88rem",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--border)" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--border)" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
    "& .MuiSelect-icon": { color: "var(--fg-faint)" },
} as const;

interface ProductOpt {
    id: string;
    name: string;
}
interface SenderOpt {
    id: string;
    email: string;
    display_name: string | null;
}
interface Tmpl {
    id: string;
    name: string;
    subject: string;
    product_id: string | null;
    oneTime: boolean;
    sender_id: string | null;
    transactional: boolean;
    variables: string[];
    footer: EmailFooter | null;
    content_html: string | null;
    bg_color: string | null;
}

/** Field label used across the footer editor. */
function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: TEXT_60,
                mb: 0.5,
                letterSpacing: "0.02em",
            }}
        >
            {children}
        </Typography>
    );
}

const FOOTER_FIELDS: { key: keyof EmailFooter; label: string; placeholder: string }[] = [
    { key: "name", label: "Brand name", placeholder: "Acme Inc." },
    { key: "logoUrl", label: "Logo URL", placeholder: "https://…/logo.png" },
    { key: "homepageUrl", label: "Homepage", placeholder: "https://acme.com" },
    { key: "supportEmail", label: "Support email", placeholder: "support@acme.com" },
    { key: "address", label: "Address", placeholder: "123 Main St, City" },
    { key: "phone", label: "Phone", placeholder: "+1 555 123 4567" },
    { key: "quote", label: "Tagline", placeholder: "Building in the open." },
];

export default function TemplateSettings({ templateId }: { templateId: string }) {
    const [tmpl, setTmpl] = useState<Tmpl | null>(null);
    const [products, setProducts] = useState<ProductOpt[]>([]);
    const [senders, setSenders] = useState<SenderOpt[]>([]);
    const [loading, setLoading] = useState(true);

    // Editable settings.
    const [mode, setMode] = useState<"one_time" | "webhook">("one_time");
    const [productId, setProductId] = useState("");
    const [senderId, setSenderId] = useState("");
    const [transactional, setTransactional] = useState(false);
    const [footer, setFooter] = useState<EmailFooter>({});

    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sendOpen, setSendOpen] = useState(false);
    const [testOpen, setTestOpen] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [tRes, pRes, sRes] = await Promise.all([
                    fetch(`/api/templates/${templateId}`),
                    fetch("/api/products"),
                    fetch("/api/senders"),
                ]);
                const tData: any = await tRes.json();
                const pData: any = await pRes.json().catch(() => ({}));
                const sData: any = await sRes.json().catch(() => ({}));
                if (!alive) return;
                if (!tRes.ok || !tData?.ok)
                    throw new Error(tData?.error || "Could not load template.");
                const t: Tmpl = tData.template;
                setTmpl(t);
                setMode(t.product_id ? "webhook" : "one_time");
                setProductId(t.product_id || "");
                setSenderId(t.sender_id || "");
                setTransactional(!!t.transactional);
                setFooter(t.footer || {});
                if (Array.isArray(pData?.products)) setProducts(pData.products);
                if (Array.isArray(sData?.senders)) setSenders(sData.senders);
            } catch (e: any) {
                if (alive) setError(e?.message || "Could not load settings.");
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [templateId]);

    const setFooterField = useCallback((key: keyof EmailFooter, value: string) => {
        setFooter((f) => ({ ...f, [key]: value || null }));
    }, []);

    async function save() {
        if (saving) return;
        if (mode === "webhook" && !productId) {
            setError("Pick a product for a webhook-based template.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const body: any = {
                productId: mode === "webhook" ? productId : null,
                senderId: senderId || null,
                transactional,
            };
            // Only one-time templates carry their own footer.
            if (mode === "one_time") body.footer = footer;
            const res = await fetch(`/api/templates/${templateId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const d: any = await res.json().catch(() => ({}));
            if (!res.ok || !d?.ok) throw new Error(d?.message || d?.error || "Could not save.");
            setSavedMsg(true);
            setTimeout(() => setSavedMsg(false), 2500);
        } catch (e: any) {
            setError(e?.message || "Could not save.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}>
                <CircularProgress sx={{ color: ACCENT }} />
            </Box>
        );
    }
    if (!tmpl) {
        return (
            <Box sx={{ p: 4 }}>
                <Typography sx={{ color: "var(--danger)" }}>
                    {error || "Template not found."}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 760, mx: "auto", pb: 6 }}>
            {/* Header */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2.5, gap: 2 }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                    <Button
                        component={Link}
                        href={`/dashboard/templates/${templateId}`}
                        startIcon={<ArrowBackIcon sx={{ fontSize: "1.1rem !important" }} />}
                        sx={{ textTransform: "none", color: TEXT_60, minWidth: 0 }}
                    >
                        Editor
                    </Button>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: TEXT }}>
                            Settings
                        </Typography>
                        <Typography sx={{ fontSize: "0.8rem", color: TEXT_60 }}>
                            {tmpl.name}
                        </Typography>
                    </Box>
                </Stack>
                <Button
                    onClick={save}
                    disabled={saving}
                    startIcon={
                        saving ? (
                            <CircularProgress size={15} sx={{ color: "var(--fg-muted)" }} />
                        ) : (
                            <SaveIcon sx={{ fontSize: "1.05rem !important" }} />
                        )
                    }
                    sx={PRIMARY_BTN}
                >
                    Save settings
                </Button>
            </Stack>

            {error && (
                <Box
                    sx={{
                        mb: 2,
                        px: 2,
                        py: 1,
                        borderRadius: "10px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "var(--danger)",
                        fontSize: "0.85rem",
                    }}
                >
                    {error}
                </Box>
            )}

            <Stack spacing={2}>
                {/* Delivery type */}
                <GlassCard sx={{ p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: TEXT, mb: 0.4 }}>
                        Delivery type
                    </Typography>
                    <Typography sx={{ fontSize: "0.82rem", color: TEXT_60, mb: 1.6 }}>
                        How this template is sent.
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TypeCard
                            active={mode === "one_time"}
                            icon={<SendIcon sx={{ fontSize: 20 }} />}
                            title="One-time"
                            body="Compose and send directly to recipients. No product, no webhook."
                            onClick={() => setMode("one_time")}
                        />
                        <TypeCard
                            active={mode === "webhook"}
                            icon={<WebhookIcon sx={{ fontSize: 20 }} />}
                            title="Webhook"
                            body="Attach to a product and trigger sends from your app via a signed webhook."
                            onClick={() => setMode("webhook")}
                        />
                    </Stack>

                    {mode === "webhook" && (
                        <Box sx={{ mt: 2 }}>
                            <FieldLabel>Product</FieldLabel>
                            <Select
                                value={products.some((p) => p.id === productId) ? productId : ""}
                                onChange={(e) => setProductId(e.target.value)}
                                fullWidth
                                size="small"
                                displayEmpty
                                sx={darkSelect}
                            >
                                <MenuItem value="" disabled>
                                    Choose a product…
                                </MenuItem>
                                {products.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Typography sx={{ mt: 0.6, fontSize: "0.74rem", color: TEXT_60 }}>
                                The template inherits this product's footer and signing secret.
                            </Typography>
                        </Box>
                    )}
                </GlassCard>

                {/* Footer (one-time only) */}
                {mode === "one_time" && (
                    <GlassCard sx={{ p: 2.5 }}>
                        <Typography
                            sx={{ fontWeight: 700, fontSize: "0.95rem", color: TEXT, mb: 0.4 }}
                        >
                            Footer
                        </Typography>
                        <Typography sx={{ fontSize: "0.82rem", color: TEXT_60, mb: 1.6 }}>
                            One-time templates carry their own footer (no product to inherit from).
                            Leave blank for just the Elixpo Mails attribution.
                        </Typography>
                        <Box
                            sx={{
                                display: "grid",
                                gap: 1.4,
                                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                            }}
                        >
                            {FOOTER_FIELDS.map((f) => (
                                <Box key={f.key}>
                                    <FieldLabel>{f.label}</FieldLabel>
                                    <TextField
                                        value={(footer[f.key] as string) || ""}
                                        onChange={(e) => setFooterField(f.key, e.target.value)}
                                        placeholder={f.placeholder}
                                        fullWidth
                                        size="small"
                                        sx={darkField}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </GlassCard>
                )}

                {/* Sender + transactional */}
                <GlassCard sx={{ p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: TEXT, mb: 1.6 }}>
                        Sending
                    </Typography>
                    <FieldLabel>Sender override</FieldLabel>
                    <Select
                        value={senders.some((s) => s.id === senderId) ? senderId : ""}
                        onChange={(e) => setSenderId(e.target.value)}
                        fullWidth
                        size="small"
                        displayEmpty
                        sx={darkSelect}
                    >
                        <MenuItem value="">Use the default sender</MenuItem>
                        {senders.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                                {s.display_name ? `${s.display_name} <${s.email}>` : s.email}
                            </MenuItem>
                        ))}
                    </Select>

                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 2 }}>
                        <Switch
                            checked={transactional}
                            onChange={(e) => setTransactional(e.target.checked)}
                            size="small"
                            sx={{
                                "& .Mui-checked": { color: ACCENT },
                                "& .Mui-checked + .MuiSwitch-track": {
                                    backgroundColor: `${ACCENT} !important`,
                                },
                            }}
                        />
                        <Box>
                            <Typography sx={{ fontSize: "0.85rem", color: TEXT, fontWeight: 600 }}>
                                Transactional
                            </Typography>
                            <Typography sx={{ fontSize: "0.74rem", color: TEXT_60 }}>
                                Always sends (even to unsubscribed recipients) and carries no
                                unsubscribe link.
                            </Typography>
                        </Box>
                    </Stack>
                </GlassCard>

                {/* Variables */}
                <GlassCard sx={{ p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: TEXT, mb: 0.4 }}>
                        Variables
                    </Typography>
                    <Typography sx={{ fontSize: "0.82rem", color: TEXT_60, mb: 1.4 }}>
                        Declared with <code>{"{{name}}"}</code> in the subject or body. Filled in
                        per send.
                    </Typography>
                    {tmpl.variables.length ? (
                        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.7 }}>
                            {tmpl.variables.map((v) => (
                                <Chip
                                    key={v}
                                    label={`{{${v}}}`}
                                    size="small"
                                    sx={{
                                        height: 24,
                                        fontFamily: "var(--font-geist-mono)",
                                        fontSize: "0.74rem",
                                        color: ACCENT,
                                        bgcolor: "var(--accent-tint)",
                                        border: "1px solid var(--accent-border)",
                                    }}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Typography sx={{ fontSize: "0.82rem", color: "var(--fg-faint)" }}>
                            No variables yet.
                        </Typography>
                    )}
                </GlassCard>

                {/* Send */}
                <GlassCard sx={{ p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: TEXT, mb: 0.4 }}>
                        {mode === "webhook" ? "Send manually" : "Whom to send"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.82rem", color: TEXT_60, mb: 1.6 }}>
                        {mode === "webhook"
                            ? "This template is normally triggered by your product's webhook. You can also send it manually."
                            : "Send this template to one or more recipients."}
                    </Typography>
                    <Stack direction="row" spacing={1.2}>
                        <Button
                            onClick={() => setTestOpen(true)}
                            startIcon={<BoltIcon sx={{ fontSize: "1.05rem !important" }} />}
                            sx={GHOST_BTN}
                        >
                            Test send
                        </Button>
                        <Button
                            onClick={() => setSendOpen(true)}
                            startIcon={<SendIcon sx={{ fontSize: "1.05rem !important" }} />}
                            sx={PRIMARY_BTN}
                        >
                            Send now
                        </Button>
                    </Stack>
                </GlassCard>
            </Stack>

            <TemplateTestDialog
                open={testOpen}
                onClose={() => setTestOpen(false)}
                templateId={templateId}
                subject={tmpl.subject}
                variables={tmpl.variables}
                getContentHtml={async () => tmpl.content_html || ""}
                bgColor={tmpl.bg_color || undefined}
            />
            <TemplateSendDialog
                open={sendOpen}
                onClose={() => setSendOpen(false)}
                templateId={templateId}
                subject={tmpl.subject}
                variables={tmpl.variables}
                getContentHtml={async () => tmpl.content_html || ""}
                bgColor={tmpl.bg_color || undefined}
            />

            <Snackbar
                open={savedMsg}
                autoHideDuration={2500}
                onClose={() => setSavedMsg(false)}
                message="Settings saved"
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            />
        </Box>
    );
}

function TypeCard({
    active,
    icon,
    title,
    body,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    title: string;
    body: string;
    onClick: () => void;
}) {
    return (
        <Box
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
            sx={{
                flex: 1,
                p: 1.6,
                borderRadius: "12px",
                cursor: "pointer",
                border: `1.5px solid ${active ? ACCENT : "var(--border)"}`,
                background: active ? "var(--accent-tint)" : "var(--surface-2)",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: ACCENT },
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 0.6, color: active ? ACCENT : TEXT }}
            >
                {icon}
                <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>{title}</Typography>
            </Stack>
            <Typography sx={{ fontSize: "0.78rem", color: TEXT_60, lineHeight: 1.5 }}>
                {body}
            </Typography>
        </Box>
    );
}
