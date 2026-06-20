"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import { Box, Button, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "./dashboard-ui";
import { GlassCard } from "./glass-card";

const ACCENT = "#9b7bf7";
const TEXT_60 = "rgba(245,245,244,0.6)";

interface TemplateSummary {
    id: string;
    slug: string;
    name: string;
    kind: string;
    subject: string;
    variables: string[];
    status: string;
    updated_at: string;
}

const NEW_BTN = {
    textTransform: "none" as const,
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#fff",
    px: 2.4,
    py: 1.05,
    borderRadius: "10px",
    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
    boxShadow: "0 6px 18px rgba(124,92,255,0.32)",
    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
};

function relativeTime(iso: string): string {
    const t = Date.parse(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
    if (Number.isNaN(t)) return "";
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export default function TemplatesList() {
    const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    async function load() {
        setError(null);
        try {
            const res = await fetch("/api/templates");
            const d: any = await res.json();
            if (!res.ok || !d?.ok) throw new Error("Could not load templates.");
            setTemplates(d.templates);
        } catch (e: any) {
            setError(e?.message || "Could not load templates.");
            setTemplates([]);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function remove(id: string) {
        if (!confirm("Delete this template? This cannot be undone.")) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setTemplates((prev) => (prev || []).filter((t) => t.id !== id));
        } catch {
            setError("Could not delete the template.");
        } finally {
            setDeleting(null);
        }
    }

    if (templates === null) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
                <CircularProgress sx={{ color: ACCENT }} />
            </Box>
        );
    }

    return (
        <Box>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                <Button component={Link} href="/dashboard/templates/new" startIcon={<AddIcon sx={{ fontSize: "1.1rem !important" }} />} sx={NEW_BTN}>
                    New template
                </Button>
            </Stack>

            {error && (
                <Box sx={{ mb: 2, px: 2, py: 1.2, borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: "0.85rem" }}>
                    {error}
                </Box>
            )}

            {templates.length === 0 ? (
                <EmptyState
                    icon={DescriptionIcon}
                    headline="No templates yet"
                    subtext="Design your first email in the visual editor — add {{variables}} for the parts that change per recipient."
                    cta={
                        <Button component={Link} href="/dashboard/templates/new" startIcon={<AddIcon sx={{ fontSize: "1.1rem !important" }} />} sx={NEW_BTN}>
                            Create a template
                        </Button>
                    }
                />
            ) : (
                <Stack spacing={1.5}>
                    {templates.map((t) => (
                        <GlassCard key={t.id} sx={{ p: 0 }}>
                            <Stack direction="row" alignItems="center" sx={{ p: 2, gap: 2 }}>
                                <Box
                                    component={Link}
                                    href={`/dashboard/templates/${t.id}`}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        flex: 1,
                                        minWidth: 0,
                                        textDecoration: "none",
                                        color: "inherit",
                                        "&:hover .t-name": { color: ACCENT },
                                    }}
                                >
                                    <Box sx={{ width: 40, height: 40, borderRadius: "11px", display: "grid", placeItems: "center", background: "rgba(155,123,247,0.12)", border: "1px solid rgba(155,123,247,0.28)", flexShrink: 0 }}>
                                        <DescriptionIcon sx={{ fontSize: 20, color: ACCENT }} />
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography className="t-name" sx={{ fontWeight: 700, fontSize: "1rem", color: "#f5f5f4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.15s ease" }}>
                                                {t.name}
                                            </Typography>
                                        <Chip label={t.slug} size="small" sx={{ height: 20, fontFamily: "var(--font-geist-mono)", fontSize: "0.68rem", color: "rgba(245,245,244,0.6)", bgcolor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                                        {t.variables.length > 0 && (
                                            <Chip label={`${t.variables.length} var${t.variables.length > 1 ? "s" : ""}`} size="small" sx={{ height: 20, fontSize: "0.68rem", color: "#c4b5fd", bgcolor: "rgba(155,123,247,0.12)", border: "1px solid rgba(155,123,247,0.3)" }} />
                                        )}
                                    </Stack>
                                        <Typography sx={{ color: TEXT_60, fontSize: "0.85rem", mt: 0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {t.subject || "No subject"} · updated {relativeTime(t.updated_at)}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                    <Button component={Link} href={`/dashboard/templates/${t.id}`} startIcon={<EditIcon sx={{ fontSize: "1rem !important" }} />} sx={{ textTransform: "none", fontSize: "0.85rem", color: "rgba(245,245,244,0.8)", borderRadius: "9px", "&:hover": { background: "rgba(255,255,255,0.05)", color: "#fff" } }}>
                                        Edit
                                    </Button>
                                    <Button onClick={() => remove(t.id)} disabled={deleting === t.id} sx={{ minWidth: 0, p: 1, color: "rgba(245,245,244,0.5)", borderRadius: "9px", "&:hover": { background: "rgba(239,68,68,0.1)", color: "#fca5a5" } }}>
                                        {deleting === t.id ? <CircularProgress size={16} sx={{ color: "rgba(245,245,244,0.5)" }} /> : <DeleteOutlineIcon sx={{ fontSize: 19 }} />}
                                    </Button>
                                </Stack>
                            </Stack>
                        </GlassCard>
                    ))}
                </Stack>
            )}
        </Box>
    );
}
