"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    InputAdornment,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "./dashboard-ui";
import { BORDER, SURFACE } from "./glass-card";
import { GlassCard } from "./glass-card";

const ACCENT = "#9b7bf7";
const TEXT_60 = "rgba(245,245,244,0.6)";
const TEXT_40 = "rgba(245,245,244,0.4)";

// Shared dark field / select styling (matches webhooks/products managers).
const darkField = {
    "& .MuiOutlinedInput-root": {
        color: "#f5f5f4",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.02)",
        "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
        "&:hover fieldset": { borderColor: "rgba(155,123,247,0.4)" },
        "&.Mui-focused fieldset": { borderColor: ACCENT },
    },
    "& .MuiInputBase-input": { fontSize: "0.92rem", py: 1.05 },
    "& .MuiInputBase-input::placeholder": { color: "rgba(245,245,244,0.35)", opacity: 1 },
};

const darkSelect = {
    color: "#f5f5f4",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.02)",
    minWidth: 150,
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.12)" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(155,123,247,0.4)" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
    "& .MuiSelect-icon": { color: TEXT_40 },
    "& .MuiSelect-select": { fontSize: "0.9rem", py: 1.05 },
};

const darkMenuProps = {
    slotProps: {
        paper: {
            sx: {
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                backgroundImage: "none",
                "& .MuiMenuItem-root": { color: "#f5f5f4", fontSize: "0.9rem" },
                "& .MuiMenuItem-root.Mui-selected": { background: "rgba(155,123,247,0.12)" },
            },
        },
    },
};

type SortKey = "recent" | "oldest" | "name";

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
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<SortKey>("recent");

    // Filter by name / slug / subject, then sort.
    const visible = useMemo(() => {
        const list = templates ?? [];
        const q = query.trim().toLowerCase();
        const filtered = q
            ? list.filter(
                  (t) =>
                      t.name.toLowerCase().includes(q) ||
                      t.slug.toLowerCase().includes(q) ||
                      (t.subject ?? "").toLowerCase().includes(q),
              )
            : list;
        const ts = (iso: string) =>
            Date.parse(iso?.includes("T") ? iso : `${iso}`.replace(" ", "T") + "Z") || 0;
        return [...filtered].sort((a, b) => {
            if (sort === "name") return a.name.localeCompare(b.name);
            if (sort === "oldest") return ts(a.updated_at) - ts(b.updated_at);
            return ts(b.updated_at) - ts(a.updated_at); // recent
        });
    }, [templates, query, sort]);

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
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ sm: "center" }}
                justifyContent="flex-end"
                sx={{ mb: 2 }}
            >
                {templates.length > 0 && (
                    <>
                        <TextField
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search templates…"
                            size="small"
                            sx={{ ...darkField, flex: 1, width: { xs: "100%", sm: "auto" } }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 18, color: TEXT_40 }} />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                        <Select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as SortKey)}
                            size="small"
                            sx={darkSelect}
                            MenuProps={darkMenuProps}
                        >
                            <MenuItem value="recent">Recently updated</MenuItem>
                            <MenuItem value="oldest">Oldest first</MenuItem>
                            <MenuItem value="name">Name (A–Z)</MenuItem>
                        </Select>
                    </>
                )}
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
            ) : visible.length === 0 ? (
                <Typography sx={{ fontSize: "0.88rem", color: TEXT_60, textAlign: "center", py: 4 }}>
                    No templates match &ldquo;{query.trim()}&rdquo;
                </Typography>
            ) : (
                <Stack spacing={1.5}>
                    {visible.map((t) => (
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
