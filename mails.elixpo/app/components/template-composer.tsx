"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DataObjectIcon from "@mui/icons-material/DataObject";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Box, Button, Chip, CircularProgress, Snackbar, Stack, Switch, TextField, Tooltip, Typography } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BG_COLOR, type EmailFooter, wrapEmailHtml } from "@/lib/render";
import { extractVariables } from "@/lib/template-vars";
import { GHOST_BTN } from "./dashboard-ui";
import { GlassCard } from "./glass-card";
import AttachmentsStrip, { type Attachment } from "./attachments-strip";
import ComposerToolbar from "./composer-toolbar";
import LixEditor from "./lix-editor";
import TemplateTestDialog from "./template-test-dialog";

const ACCENT = "#9b7bf7";
const TEXT_60 = "rgba(245,245,244,0.6)";

// Common email canvas colours offered as quick swatches (plus a custom picker).
const BG_PRESETS = ["#f4f4f7", "#ffffff", "#eef2ff", "#f0fdf4", "#0b0d12"];

// Email clients don't render diagrams/equations/PDF/TOC/syntax-highlighting —
// keep the editor focused on what survives in an inbox.
const EMAIL_FEATURES = {
    equations: false,
    mermaid: false,
    tableOfContents: false,
    pdf: false,
    codeHighlighting: false,
    linkPreview: false,
    dates: false,
    images: true,
    buttons: true,
    markdownLinks: true,
};

const darkField = {
    "& .MuiOutlinedInput-root": {
        color: "#f5f5f4",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.02)",
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: "rgba(155,123,247,0.4)" },
        "&.Mui-focused fieldset": { borderColor: ACCENT },
    },
    "& .MuiInputBase-input": { fontSize: "0.92rem", py: 0.95 },
    "& .MuiInputBase-input::placeholder": { color: "rgba(245,245,244,0.35)", opacity: 1 },
};

const SAVE_BTN_SX = {
    textTransform: "none" as const,
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#fff",
    px: 2.6,
    py: 1.1,
    borderRadius: "10px",
    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
    boxShadow: "0 6px 18px rgba(124,92,255,0.32)",
    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
    "&.Mui-disabled": { background: "rgba(255,255,255,0.06)", color: "rgba(245,245,244,0.4)" },
};

/**
 * lixeditor `uploadFile` hook: send a dropped/pasted image to our host upload
 * endpoint and return the optimized Cloudinary URL (never base64 in the email).
 */
async function uploadTemplateImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads/image", { method: "POST", body: form });
    const d: any = await res.json().catch(() => ({}));
    if (!res.ok || !d?.url) throw new Error(d?.message || d?.error || "Image upload failed");
    return d.url as string;
}

export default function TemplateComposer({ templateId }: { templateId?: string }) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [subject, setSubject] = useState("");
    const [initialContent, setInitialContent] = useState<any[] | undefined>(undefined);
    const [blocks, setBlocks] = useState<any[]>([]);
    const apiRef = useRef<any>(null);
    // Images uploaded during this edit session — sent on save so the server can
    // delete any that didn't end up in the final content.
    const uploadedImagesRef = useRef<string[]>([]);

    // Single upload path for both drag/drop/paste (editor hook) and the toolbar:
    // upload to Cloudinary and remember the URL for cleanup.
    const handleUpload = useCallback(async (file: File) => {
        const url = await uploadTemplateImage(file);
        uploadedImagesRef.current.push(url);
        return url;
    }, []);

    const [loading, setLoading] = useState(Boolean(templateId));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedMsg, setSavedMsg] = useState(false);
    const [testOpen, setTestOpen] = useState(false);

    // Email canvas colour + true-to-inbox preview.
    const [bgColor, setBgColor] = useState(DEFAULT_BG_COLOR);
    const [showPreview, setShowPreview] = useState(true);
    const [previewHtml, setPreviewHtml] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [footer, setFooter] = useState<EmailFooter | null>(null);
    const [transactional, setTransactional] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    // Show a representative brand footer in the preview: the first product that
    // actually has footer details (logo/address/phone/quote), else the first
    // product. (At send, the real footer comes from the triggering product.)
    useEffect(() => {
        let alive = true;
        fetch("/api/products")
            .then((r) => r.json())
            .then((d: any) => {
                if (!alive || !d?.ok || !Array.isArray(d.products) || d.products.length === 0) return;
                const p =
                    d.products.find(
                        (x: any) => x.logo_url || x.address || x.phone || x.footer_note,
                    ) || d.products[0];
                setFooter({
                    name: p.name,
                    logoUrl: p.logo_url,
                    homepageUrl: p.homepage_url,
                    supportEmail: p.support_email,
                    address: p.address,
                    phone: p.phone,
                    quote: p.footer_note,
                });
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!templateId) return;
        let alive = true;
        fetch(`/api/templates/${templateId}`)
            .then((r) => r.json())
            .then((d: any) => {
                if (!alive) return;
                if (d?.ok) {
                    const t = d.template;
                    setName(t.name || "");
                    setSlug(t.slug || "");
                    setSubject(t.subject || "");
                    setBgColor(t.bg_color || DEFAULT_BG_COLOR);
                    setAttachments(Array.isArray(t.attachments) ? (t.attachments as Attachment[]) : []);
                    setTransactional(Boolean(t.transactional));
                    setInitialContent(Array.isArray(t.content) ? t.content : undefined);
                    setBlocks(Array.isArray(t.content) ? t.content : []);
                } else {
                    setError("Could not load this template.");
                }
            })
            .catch(() => alive && setError("Could not load this template."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [templateId]);

    // Live {{variable}} detection from the subject + editor content.
    const variables = useMemo(
        () => extractVariables(subject, JSON.stringify(blocks)),
        [subject, blocks],
    );

    // Gate saving: require a name + subject and a non-trivial body. Templates are
    // attached to products via webhooks (configured on the product), not here.
    const bodyText = useMemo(() => blocksToPlainText(blocks), [blocks]);
    const canSave = name.trim().length > 0 && subject.trim().length > 0 && bodyText.length > 2;

    // Debounced true-to-inbox preview: drop the editor's email-safe HTML into the
    // real email shell (chosen canvas colour + white card) so the user sees what
    // the recipient will see. {{variables}} are left literal in the preview.
    useEffect(() => {
        if (!showPreview) return;
        const id = setTimeout(() => {
            try {
                const html = apiRef.current ? apiRef.current.getHTML() : "";
                setPreviewHtml(wrapEmailHtml(html, bgColor, footer));
            } catch {
                /* editor not mounted yet */
            }
        }, 350);
        return () => clearTimeout(id);
    }, [blocks, bgColor, showPreview, footer, editorReady]);

    async function save() {
        if (saving) return;
        if (!name.trim()) {
            setError("Give the template a name.");
            return;
        }
        setSaving(true);
        setError(null);
        setSavedMsg(false);
        try {
            const contentJson = apiRef.current ? apiRef.current.getBlocks() : blocks;
            const contentHtml = apiRef.current ? await apiRef.current.getHTML() : "";
            const payload: any = {
                name: name.trim(),
                slug: slug.trim() || undefined,
                subject,
                contentJson,
                contentHtml,
                bgColor,
                uploadedImages: uploadedImagesRef.current,
                attachments: attachments.map((a) => ({ kind: a.kind, source: a.source, filename: a.filename, mime: a.mime })),
                transactional,
            };
            const url = templateId ? `/api/templates/${templateId}` : "/api/templates";
            const res = await fetch(url, {
                method: templateId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const d: any = await res.json().catch(() => ({}));
            if (!res.ok || !d?.ok) throw new Error(d?.message || d?.error || "Could not save.");
            if (!templateId && d.template?.id) {
                router.replace(`/dashboard/templates/${d.template.id}`);
            } else {
                setSavedMsg(true);
                setTimeout(() => setSavedMsg(false), 2500);
            }
        } catch (e: any) {
            setError(e?.message || "Could not save.");
        } finally {
            setSaving(false);
        }
    }

    // ⌘/Ctrl+S saves. Refs keep the latest save + gate without re-binding the listener.
    const saveRef = useRef<() => void>(() => {});
    const canSaveRef = useRef(false);
    saveRef.current = save;
    canSaveRef.current = canSave && !saving;
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (canSaveRef.current) saveRef.current();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}>
                <CircularProgress sx={{ color: ACCENT }} />
            </Box>
        );
    }

    return (
        // Full-bleed: break out of the dashboard's max-width container and fill
        // the viewport so the editor + preview sit side by side in one screen.
        <Box
            sx={{
                width: "100vw",
                ml: "calc(50% - 50vw)",
                px: { xs: 2, md: 3 },
                display: "flex",
                flexDirection: "column",
                height: { xs: "auto", lg: "calc(100vh - 140px)" },
                minHeight: { lg: 540 },
            }}
        >
            {/* Compact header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, gap: 2, flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                    <Button
                        component={Link}
                        href="/dashboard/templates"
                        startIcon={<ArrowBackIcon sx={{ fontSize: "1.1rem !important" }} />}
                        sx={{ textTransform: "none", color: TEXT_60, minWidth: 0, "&:hover": { color: "#f5f5f4" } }}
                    >
                        Templates
                    </Button>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.3rem", color: "#f5f5f4", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {templateId ? name || "Edit template" : "New template"}
                    </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    {savedMsg && <Typography sx={{ color: "#86efac", fontSize: "0.85rem" }}>Saved</Typography>}
                    <Tooltip title={templateId ? "" : "Save the template first"} arrow disableHoverListener={Boolean(templateId)}>
                        <span>
                            <Button
                                onClick={() => setTestOpen(true)}
                                disabled={!templateId}
                                startIcon={<SendIcon sx={{ fontSize: "1.05rem !important" }} />}
                                sx={{ ...GHOST_BTN, fontSize: "0.9rem", "&.Mui-disabled": { color: "rgba(245,245,244,0.4)", borderColor: "rgba(255,255,255,0.07)" } }}
                            >
                                Test send
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title={canSave ? "" : "Add a name, subject, and some body content"} arrow disableHoverListener={canSave}>
                        <span>
                            <Button
                                onClick={save}
                                disabled={saving || !canSave}
                                startIcon={saving ? <CircularProgress size={16} sx={{ color: "rgba(245,245,244,0.6)" }} /> : <SaveIcon sx={{ fontSize: "1.1rem !important" }} />}
                                sx={SAVE_BTN_SX}
                            >
                                {templateId ? "Save changes" : "Create template"}
                            </Button>
                        </span>
                    </Tooltip>
                </Stack>
            </Stack>

            {error && (
                <Box sx={{ mb: 1.5, px: 2, py: 1, borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: "0.85rem", flexShrink: 0 }}>
                    {error}
                </Box>
            )}

            {/* Variables — top strip */}
            <Stack direction="row" alignItems="center" sx={{ mb: 1.5, flexWrap: "wrap", gap: 0.8, flexShrink: 0 }}>
                <DataObjectIcon sx={{ fontSize: 17, color: ACCENT, mr: 0.4 }} />
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#f5f5f4", mr: 0.5 }}>
                    Variables{variables.length > 0 ? ` (${variables.length})` : ""}
                </Typography>
                {variables.length > 0 ? (
                    variables.map((v) => (
                        <Chip
                            key={v}
                            label={`{{${v}}}`}
                            size="small"
                            sx={{ height: 22, fontFamily: "var(--font-geist-mono)", fontSize: "0.72rem", color: "#c4b5fd", bgcolor: "rgba(155,123,247,0.12)", border: "1px solid rgba(155,123,247,0.3)" }}
                        />
                    ))
                ) : (
                    <Typography sx={{ color: TEXT_60, fontSize: "0.8rem" }}>
                        — type{" "}
                        <Box component="span" sx={{ fontFamily: "var(--font-geist-mono)", color: "#86efac" }}>
                            {"{{name}}"}
                        </Box>{" "}
                        in the subject or body to add one
                    </Typography>
                )}
            </Stack>

            {/* Workspace: compose | inbox preview */}
            <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2, flex: 1, minHeight: 0 }}>
                {/* LEFT — compose (metadata header + editor + toolbar) */}
                <GlassCard sx={{ p: 0, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: { xs: 540, lg: 0 } }}>
                    <Box sx={{ p: 1.6, borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 1.2, flexShrink: 0 }}>
                        <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" } }}>
                            <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" fullWidth size="small" sx={darkField} />
                            <TextField value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug (auto)" fullWidth size="small" sx={darkField} />
                        </Box>
                        <TextField
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Subject line — supports {{variables}}"
                            fullWidth
                            size="small"
                            sx={darkField}
                        />
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Switch
                                checked={transactional}
                                onChange={(e) => setTransactional(e.target.checked)}
                                size="small"
                                sx={{ "& .Mui-checked": { color: ACCENT }, "& .Mui-checked + .MuiSwitch-track": { backgroundColor: `${ACCENT} !important` } }}
                            />
                            <Typography sx={{ fontSize: "0.82rem", color: "rgba(245,245,244,0.7)" }}>Transactional</Typography>
                            <Tooltip
                                arrow
                                title="Receipts, password resets, etc. — always sends, even to unsubscribed recipients, and carries no unsubscribe link."
                            >
                                <Typography sx={{ fontSize: "0.78rem", color: TEXT_60, cursor: "help", borderBottom: "1px dotted rgba(245,245,244,0.3)" }}>
                                    what's this?
                                </Typography>
                            </Tooltip>
                        </Stack>
                    </Box>

                    {/* Editor body — scrolls. Extra left padding keeps BlockNote's
                        block handles (+ / drag), which sit in a left gutter, in view. */}
                    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", py: { xs: 2, md: 2.5 }, pr: { xs: 2, md: 3 }, pl: { xs: 5, md: 7, lg : 8 } }}>
                        <LixEditor
                            initialContent={initialContent}
                            features={EMAIL_FEATURES}
                            placeholder="Compose your email… type '/' for blocks, {{variables}} for dynamic values"
                            uploadFile={handleUpload}
                            variableSuggestions={variables}
                            buttonDefaults={{ color: "#7c5cff", align: "left" }}
                            onReady={(api) => {
                                apiRef.current = api;
                                setEditorReady(true);
                            }}
                            onChange={(ed: any) => setBlocks(ed?.document ?? [])}
                        />
                    </Box>
                    <ComposerToolbar getEditor={() => apiRef.current?.getEditor?.() ?? null} uploadImage={handleUpload} />
                    <AttachmentsStrip attachments={attachments} onChange={setAttachments} onToast={setToast} />
                </GlassCard>

                {/* RIGHT — inbox preview */}
                <GlassCard sx={{ p: 0, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: { xs: 480, lg: 0 } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.3, borderBottom: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap", gap: 1, flexShrink: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <VisibilityIcon sx={{ fontSize: 18, color: ACCENT }} />
                            <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#f5f5f4" }}>Inbox preview</Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography sx={{ color: TEXT_60, fontSize: "0.78rem", mr: 0.2, display: { xs: "none", sm: "block" } }}>Background</Typography>
                            {BG_PRESETS.map((c) => (
                                <Box
                                    key={c}
                                    onClick={() => setBgColor(c)}
                                    title={c}
                                    sx={{ width: 20, height: 20, borderRadius: "6px", cursor: "pointer", background: c, border: bgColor.toLowerCase() === c.toLowerCase() ? `2px solid ${ACCENT}` : "1px solid rgba(255,255,255,0.18)" }}
                                />
                            ))}
                            <Box
                                component="label"
                                title="Custom colour"
                                sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "6px", overflow: "hidden", cursor: "pointer", border: "1px solid rgba(255,255,255,0.18)", background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
                            >
                                <Box component="input" type="color" value={bgColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBgColor(e.target.value)} sx={{ width: 0, height: 0, opacity: 0, p: 0, m: 0, border: 0 }} />
                            </Box>
                            <Button onClick={() => setShowPreview((v) => !v)} sx={{ ...GHOST_BTN, py: 0.4, px: 1.3, fontSize: "0.78rem", ml: 0.3 }}>
                                {showPreview ? "Hide" : "Show"}
                            </Button>
                        </Stack>
                    </Stack>
                    {showPreview ? (
                        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", p: { xs: 1.5, md: 2 } }}>
                            <Box sx={{ mb: 1, px: 0.5, flexShrink: 0 }}>
                                <Typography sx={{ color: "rgba(245,245,244,0.45)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Subject</Typography>
                                <Typography sx={{ color: "#f5f5f4", fontSize: "0.92rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {subject.trim() || "(no subject)"}
                                </Typography>
                            </Box>
                            <Box
                                component="iframe"
                                title="Email inbox preview"
                                srcDoc={previewHtml}
                                sx={{ flex: 1, minHeight: 0, width: "100%", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", background: "#fff", display: "block" }}
                            />
                        </Box>
                    ) : (
                        <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
                            <Typography sx={{ color: TEXT_60, fontSize: "0.85rem" }}>Preview hidden</Typography>
                        </Box>
                    )}
                </GlassCard>
            </Box>

            {templateId && (
                <TemplateTestDialog
                    open={testOpen}
                    onClose={() => setTestOpen(false)}
                    templateId={templateId}
                    subject={subject}
                    variables={variables}
                    getContentHtml={async () => (apiRef.current ? await apiRef.current.getHTML() : "")}
                    bgColor={bgColor}
                />
            )}

            <Snackbar open={Boolean(toast)} autoHideDuration={2600} onClose={() => setToast(null)} message={toast || ""} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
        </Box>
    );
}

/** Flatten a BlockNote document to its plain text (for the min-length gate). */
function blocksToPlainText(blocks: any[]): string {
    if (!Array.isArray(blocks)) return "";
    let out = "";
    for (const b of blocks) {
        if (Array.isArray(b?.content)) {
            for (const c of b.content) if (typeof c?.text === "string") out += c.text;
        }
        if (Array.isArray(b?.children)) out += ` ${blocksToPlainText(b.children)}`;
        out += " ";
    }
    return out.trim();
}
