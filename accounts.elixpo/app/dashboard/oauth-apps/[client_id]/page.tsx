"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import SaveIcon from "@mui/icons-material/Save";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const cardSx = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    p: 3,
};

const textFieldSx = {
    "& .MuiOutlinedInput-root": {
        color: "var(--fg)",
        "& fieldset": { borderColor: "var(--border)" },
        "&:hover fieldset": { borderColor: "var(--border)" },
        "&.Mui-focused fieldset": { borderColor: "#ff7759" },
    },
    "& .MuiInputLabel-root": { color: "var(--fg-muted)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#ff7759" },
    "& .MuiFormHelperText-root": { color: "var(--fg-faint)" },
};

const monoBox = {
    display: "flex",
    alignItems: "center",
    gap: 1,
    background: "var(--surface)",
    border: "1px solid rgba(255, 119, 89,0.2)",
    borderRadius: "8px",
    p: 1.5,
};

export default function OAuthAppSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.client_id as string;

    const [app, setApp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{
        text: string;
        type: "success" | "error";
    } | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const [regeneratedSecret, setRegeneratedSecret] = useState<string | null>(
        null,
    );
    const [regenerating, setRegenerating] = useState(false);

    const [form, setForm] = useState({
        name: "",
        description: "",
        homepage_url: "",
        redirect_uris: [""] as string[],
    });

    // ── Webhook endpoints state ─────────────────────────────────────────
    const WEBHOOK_EVENTS = [
        "user.deleted",
        "user.updated",
        "app.revoked",
        "app.authorized",
    ] as const;

    interface WebhookEndpoint {
        id: string;
        url: string;
        events: string[];
        is_active: boolean;
        label: string | null;
        created_at: string;
        secret_set_at: string;
        last_delivery_at: string | null;
        last_status_code: number | null;
        last_error: string | null;
    }
    const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
    const [endpointsLoading, setEndpointsLoading] = useState(true);
    // Newly minted plaintext secrets keyed by endpoint id — surfaced once
    // after create or rotate, dismissed when the user clicks "I've saved it".
    const [revealedSecrets, setRevealedSecrets] = useState<
        Record<string, string>
    >({});
    const [endpointBusy, setEndpointBusy] = useState<string | null>(null);
    const [webhookMessage, setWebhookMessage] = useState<{
        text: string;
        type: "success" | "error";
    } | null>(null);

    // New-endpoint form (modeless inline panel above the table).
    const [newEndpoint, setNewEndpoint] = useState<{
        url: string;
        events: string[];
        label: string;
    }>({ url: "", events: [], label: "" });
    const [creatingEndpoint, setCreatingEndpoint] = useState(false);

    // ── Activity stats (sign-ins + webhook delivery) ────────────────────
    interface AppStats {
        request_count: number;
        last_used: string | null;
        total_sign_ins: number;
        unique_users: number;
        active_sessions: number;
        sign_in_timeline: Array<{ date: string; count: number }>;
        webhooks: {
            total_endpoints: number;
            active_endpoints: number;
            last_delivery_at: string | null;
        };
    }
    const [stats, setStats] = useState<AppStats | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(
                    `/api/auth/oauth-clients/${clientId}/stats`,
                    { credentials: "include" },
                );
                if (!res.ok) return;
                const data: any = await res.json();
                if (!cancelled) setStats(data);
            } catch {
                /* non-fatal — stats panel just renders empty state */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [clientId]);

    useEffect(() => {
        const fetchApp = async () => {
            try {
                const res = await fetch(`/api/auth/oauth-clients/${clientId}`, {
                    credentials: "include",
                });
                if (!res.ok) throw new Error("Not found");
                const data: any = await res.json();
                setApp(data);
                const uris = Array.isArray(data.redirect_uris)
                    ? data.redirect_uris
                    : data.redirect_uris
                      ? [data.redirect_uris]
                      : [""];
                setForm({
                    name: data.name || "",
                    description: data.description || "",
                    homepage_url: data.homepage_url || "",
                    redirect_uris: uris.length > 0 ? uris : [""],
                });
            } catch {
                router.push("/dashboard/oauth-apps");
            } finally {
                setLoading(false);
            }
        };
        fetchApp();
    }, [clientId, router]);

    // Load the app's webhook endpoints. Separate effect so the OAuth-app
    // fetch can fail open if endpoints lookup hiccups.
    const loadEndpoints = async () => {
        try {
            const res = await fetch(
                `/api/auth/oauth-clients/${clientId}/webhooks`,
                { credentials: "include" },
            );
            if (!res.ok) return;
            const data: any = await res.json();
            setEndpoints(data.endpoints || []);
        } catch {
            /* non-fatal */
        } finally {
            setEndpointsLoading(false);
        }
    };
    useEffect(() => {
        loadEndpoints();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadEndpoints]);

    const handleCreateEndpoint = async () => {
        const url = newEndpoint.url.trim();
        if (!url) {
            setWebhookMessage({ text: "URL is required", type: "error" });
            return;
        }
        if (newEndpoint.events.length === 0) {
            setWebhookMessage({
                text: "Select at least one event",
                type: "error",
            });
            return;
        }
        setCreatingEndpoint(true);
        setWebhookMessage(null);
        try {
            const res = await fetch(
                `/api/auth/oauth-clients/${clientId}/webhooks`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url,
                        events: newEndpoint.events,
                        label: newEndpoint.label || null,
                    }),
                },
            );
            const data: any = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create");
            setRevealedSecrets((s) => ({
                ...s,
                [data.id]: data.webhook_secret,
            }));
            setNewEndpoint({ url: "", events: [], label: "" });
            await loadEndpoints();
            setWebhookMessage({
                text: "Endpoint created — copy the secret below",
                type: "success",
            });
        } catch (err: any) {
            setWebhookMessage({ text: err.message, type: "error" });
        } finally {
            setCreatingEndpoint(false);
        }
    };

    const handleToggleEndpoint = async (
        ep: WebhookEndpoint,
        is_active: boolean,
    ) => {
        setEndpointBusy(ep.id);
        try {
            const res = await fetch(
                `/api/auth/oauth-clients/${clientId}/webhooks/${ep.id}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ is_active }),
                },
            );
            if (!res.ok) {
                const e: any = await res.json();
                throw new Error(e.error || "Update failed");
            }
            await loadEndpoints();
        } catch (err: any) {
            setWebhookMessage({ text: err.message, type: "error" });
        } finally {
            setEndpointBusy(null);
        }
    };

    const handleDeleteEndpoint = async (ep: WebhookEndpoint) => {
        if (
            !confirm(
                `Delete endpoint ${ep.url}? This stops deliveries to it and revokes its secret.`,
            )
        )
            return;
        setEndpointBusy(ep.id);
        try {
            const res = await fetch(
                `/api/auth/oauth-clients/${clientId}/webhooks/${ep.id}`,
                { method: "DELETE", credentials: "include" },
            );
            if (!res.ok) {
                const e: any = await res.json();
                throw new Error(e.error || "Delete failed");
            }
            await loadEndpoints();
        } catch (err: any) {
            setWebhookMessage({ text: err.message, type: "error" });
        } finally {
            setEndpointBusy(null);
        }
    };

    const handleRotateEndpoint = async (ep: WebhookEndpoint) => {
        if (
            !confirm(
                "Rotate this endpoint's secret? The previous secret stops being honored immediately.",
            )
        )
            return;
        setEndpointBusy(ep.id);
        setWebhookMessage(null);
        try {
            const res = await fetch(
                `/api/auth/oauth-clients/${clientId}/webhooks/${ep.id}/rotate`,
                { method: "POST", credentials: "include" },
            );
            const data: any = await res.json();
            if (!res.ok) throw new Error(data.error || "Rotation failed");
            setRevealedSecrets((s) => ({
                ...s,
                [ep.id]: data.webhook_secret,
            }));
            await loadEndpoints();
        } catch (err: any) {
            setWebhookMessage({ text: err.message, type: "error" });
        } finally {
            setEndpointBusy(null);
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const redirectUris = form.redirect_uris
                .map((u) => u.trim())
                .filter(Boolean);
            const res = await fetch(`/api/auth/oauth-clients/${clientId}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    description: form.description,
                    homepage_url: form.homepage_url,
                    redirect_uris: redirectUris,
                }),
            });
            if (!res.ok) {
                const err: any = await res.json();
                throw new Error(err.error || "Failed to save");
            }
            const updated: any = await res.json();
            setApp(updated);
            setMessage({
                text: "Application updated successfully",
                type: "success",
            });
        } catch (err: any) {
            setMessage({ text: err.message, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (
            !confirm(
                "Delete this application? All OAuth tokens issued by this app will be revoked. This cannot be undone.",
            )
        )
            return;
        try {
            const res = await fetch(`/api/auth/oauth-clients/${clientId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete");
            router.push("/dashboard/oauth-apps");
        } catch {
            setMessage({ text: "Failed to delete application", type: "error" });
        }
    };

    const handleRegenerateSecret = async () => {
        if (
            !confirm(
                "Regenerate client secret? The old secret will stop working immediately.",
            )
        )
            return;
        setRegenerating(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/auth/oauth-clients/${clientId}`, {
                method: "PATCH",
                credentials: "include",
            });
            if (!res.ok) {
                const err: any = await res.json();
                throw new Error(err.error || "Failed to regenerate secret");
            }
            const data: any = await res.json();
            setRegeneratedSecret(data.client_secret);
            setMessage({
                text: "Client secret regenerated. Copy it now.",
                type: "success",
            });
        } catch (err: any) {
            setMessage({ text: err.message, type: "error" });
        } finally {
            setRegenerating(false);
        }
    };

    const faviconUrl = form.homepage_url
        ? (() => {
              try {
                  return `https://www.google.com/s2/favicons?domain=${new URL(form.homepage_url).hostname}&sz=64`;
              } catch {
                  return null;
              }
          })()
        : null;

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 10,
                }}
            >
                <CircularProgress sx={{ color: "#ff7759" }} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Back + Header */}
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push("/dashboard/oauth-apps")}
                sx={{
                    color: "var(--fg-faint)",
                    mb: 2,
                    textTransform: "none",
                    "&:hover": { color: "var(--fg)" },
                }}
            >
                Back to OAuth Apps
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                {/* Favicon */}
                {faviconUrl ? (
                    <Box
                        component="img"
                        src={faviconUrl}
                        alt=""
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "10px",
                            bgcolor: "var(--overlay)",
                            p: 0.5,
                        }}
                        onError={(e: any) => {
                            e.target.style.display = "none";
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "10px",
                            bgcolor: "rgba(255, 119, 89,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ff7759",
                            fontSize: "1.2rem",
                            fontWeight: 700,
                        }}
                    >
                        {(app?.name || "A").charAt(0).toUpperCase()}
                    </Box>
                )}
                <Box>
                    <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, color: "var(--fg)" }}
                    >
                        {app?.name || "Application Settings"}
                    </Typography>
                    {form.homepage_url && (
                        <Typography
                            component="a"
                            href={form.homepage_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                color: "var(--fg-faint)",
                                fontSize: "0.8rem",
                                textDecoration: "none",
                                fontFamily: "monospace",
                                "&:hover": { color: "#ff7759" },
                            }}
                        >
                            {(() => {
                                try {
                                    return new URL(form.homepage_url).hostname;
                                } catch {
                                    return form.homepage_url;
                                }
                            })()}
                        </Typography>
                    )}
                </Box>
                {app?.is_active === false && (
                    <Chip
                        label="Inactive"
                        size="small"
                        sx={{
                            bgcolor: "rgba(107,114,128,0.2)",
                            color: "var(--fg-faint)",
                        }}
                    />
                )}
            </Box>

            {message && (
                <Alert
                    severity={message.type}
                    onClose={() => setMessage(null)}
                    sx={{
                        mb: 3,
                        bgcolor:
                            message.type === "success"
                                ? "rgba(255, 119, 89,0.1)"
                                : "rgba(239,68,68,0.1)",
                        color:
                            message.type === "success" ? "#ff7759" : "#b91c1c",
                        border: `1px solid ${message.type === "success" ? "rgba(255, 119, 89,0.3)" : "rgba(239,68,68,0.3)"}`,
                        "& .MuiAlert-icon": {
                            color:
                                message.type === "success"
                                    ? "#ff7759"
                                    : "#b91c1c",
                        },
                    }}
                >
                    {message.text}
                </Alert>
            )}

            {/* Bento Grid */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                    gap: 2.5,
                    mb: 3,
                }}
            >
                {/* Client ID */}
                <Box sx={cardSx}>
                    <Typography
                        sx={{
                            color: "var(--fg-faint)",
                            fontSize: "0.8rem",
                            mb: 1,
                            fontWeight: 500,
                        }}
                    >
                        Client ID
                    </Typography>
                    <Box sx={monoBox}>
                        <Typography
                            sx={{
                                color: "#ff7759",
                                fontFamily: "monospace",
                                fontSize: "0.8rem",
                                flex: 1,
                                wordBreak: "break-all",
                            }}
                        >
                            {app?.client_id || clientId}
                        </Typography>
                        <Tooltip
                            title={
                                copiedField === "client_id" ? "Copied!" : "Copy"
                            }
                        >
                            <IconButton
                                size="small"
                                onClick={() =>
                                    copyToClipboard(
                                        app?.client_id || clientId,
                                        "client_id",
                                    )
                                }
                                sx={{ color: "#ff7759" }}
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Client Secret */}
                <Box sx={cardSx}>
                    <Typography
                        sx={{
                            color: "var(--fg-faint)",
                            fontSize: "0.8rem",
                            mb: 1,
                            fontWeight: 500,
                        }}
                    >
                        Client Secret
                    </Typography>
                    {regeneratedSecret ? (
                        <>
                            <Box
                                sx={{
                                    ...monoBox,
                                    border: "1px solid rgba(255, 119, 89,0.4)",
                                }}
                            >
                                <Typography
                                    sx={{
                                        color: "#ff7759",
                                        fontFamily: "monospace",
                                        fontSize: "0.8rem",
                                        flex: 1,
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {regeneratedSecret}
                                </Typography>
                                <Tooltip
                                    title={
                                        copiedField === "secret"
                                            ? "Copied!"
                                            : "Copy"
                                    }
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            copyToClipboard(
                                                regeneratedSecret,
                                                "secret",
                                            )
                                        }
                                        sx={{ color: "#ff7759" }}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "#ff7759",
                                    mt: 0.5,
                                    display: "block",
                                }}
                            >
                                Copy now — won't be shown again.
                            </Typography>
                        </>
                    ) : (
                        <>
                            <Box
                                sx={{
                                    ...monoBox,
                                    border: "1px solid rgba(239,68,68,0.2)",
                                }}
                            >
                                <Typography
                                    sx={{
                                        color: "var(--fg-faint)",
                                        fontFamily: "monospace",
                                        fontSize: "0.85rem",
                                        flex: 1,
                                    }}
                                >
                                    ••••••••••••••••••••••••••••
                                </Typography>
                                <Tooltip title="Regenerate secret">
                                    <IconButton
                                        size="small"
                                        onClick={handleRegenerateSecret}
                                        disabled={regenerating}
                                        sx={{ color: "#ff7759" }}
                                    >
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "var(--fg-faint)",
                                    mt: 0.5,
                                    display: "block",
                                }}
                            >
                                Click refresh to regenerate
                            </Typography>
                        </>
                    )}
                </Box>

                {/* General Settings (spans full width on lg) */}
                <Box sx={{ ...cardSx, gridColumn: { lg: "1 / -1" } }}>
                    <Typography
                        sx={{ color: "var(--fg)", fontWeight: 600, mb: 2 }}
                    >
                        General
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                            gap: 2,
                        }}
                    >
                        <TextField
                            fullWidth
                            label="Application Name"
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            sx={textFieldSx}
                        />
                        <TextField
                            fullWidth
                            label="Homepage URL"
                            placeholder="https://example.com"
                            value={form.homepage_url}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    homepage_url: e.target.value,
                                })
                            }
                            sx={textFieldSx}
                        />
                        <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                            <TextField
                                fullWidth
                                label="Description"
                                placeholder="What does your application do?"
                                value={form.description}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        description: e.target.value,
                                    })
                                }
                                multiline
                                rows={2}
                                sx={textFieldSx}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Redirect URIs */}
                <Box sx={cardSx}>
                    <Typography
                        sx={{ color: "var(--fg)", fontWeight: 600, mb: 0.5 }}
                    >
                        Redirect URIs
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            color: "var(--fg-faint)",
                            display: "block",
                            mb: 2,
                        }}
                    >
                        Callback URLs for authorization (up to 5)
                    </Typography>
                    {form.redirect_uris.map((uri, index) => (
                        <Box
                            key={index}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 1,
                            }}
                        >
                            <TextField
                                fullWidth
                                size="small"
                                value={uri}
                                onChange={(e) => {
                                    const updated = [...form.redirect_uris];
                                    updated[index] = e.target.value;
                                    setForm({
                                        ...form,
                                        redirect_uris: updated,
                                    });
                                }}
                                placeholder="https://example.com/callback"
                                sx={textFieldSx}
                            />
                            {form.redirect_uris.length > 1 && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        const updated =
                                            form.redirect_uris.filter(
                                                (_, i) => i !== index,
                                            );
                                        setForm({
                                            ...form,
                                            redirect_uris: updated,
                                        });
                                    }}
                                    sx={{
                                        color: "#b91c1c",
                                        "&:hover": {
                                            bgcolor: "rgba(239,68,68,0.1)",
                                        },
                                    }}
                                >
                                    <RemoveCircleOutlineIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    ))}
                    {form.redirect_uris.length < 5 && (
                        <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() =>
                                setForm({
                                    ...form,
                                    redirect_uris: [...form.redirect_uris, ""],
                                })
                            }
                            sx={{
                                color: "#ff7759",
                                textTransform: "none",
                                fontSize: "0.8rem",
                                mt: 0.5,
                            }}
                        >
                            Add URI
                        </Button>
                    )}
                </Box>

                {/* Scopes + Stats */}
                <Box sx={cardSx}>
                    <Typography
                        sx={{ color: "var(--fg)", fontWeight: 600, mb: 2 }}
                    >
                        Info
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                        <Typography
                            sx={{
                                color: "var(--fg-faint)",
                                fontSize: "0.8rem",
                                mb: 0.75,
                            }}
                        >
                            Scopes
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 0.75,
                                flexWrap: "wrap",
                            }}
                        >
                            {(Array.isArray(app?.scopes)
                                ? app.scopes
                                : ["openid", "profile", "email"]
                            ).map((s: string) => (
                                <Chip
                                    key={s}
                                    label={s}
                                    size="small"
                                    sx={{
                                        bgcolor: "rgba(255, 119, 89,0.1)",
                                        color: "#ff7759",
                                        border: "1px solid rgba(255, 119, 89,0.2)",
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>

                    {app?.request_count !== undefined && (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                sx={{
                                    color: "var(--fg-faint)",
                                    fontSize: "0.8rem",
                                    mb: 0.25,
                                }}
                            >
                                Requests
                            </Typography>
                            <Typography
                                sx={{
                                    color: "var(--fg)",
                                    fontWeight: 600,
                                    fontSize: "1.5rem",
                                }}
                            >
                                {app.request_count.toLocaleString()}
                            </Typography>
                        </Box>
                    )}

                    {app?.created_at && (
                        <Box>
                            <Typography
                                sx={{
                                    color: "var(--fg-faint)",
                                    fontSize: "0.8rem",
                                    mb: 0.25,
                                }}
                            >
                                Created
                            </Typography>
                            <Typography
                                sx={{
                                    color: "var(--fg-faint)",
                                    fontSize: "0.9rem",
                                }}
                            >
                                {new Date(app.created_at).toLocaleDateString()}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Activity panel — sign-ins, sessions, request count, and a
                30-day sign-in mini chart. Free to all tiers for now; we'll
                gate the longer windows when the tier system lands. */}
            {stats && (
                <Box sx={{ ...cardSx, mb: 3 }}>
                    <Typography
                        sx={{ color: "var(--fg)", fontWeight: 600, mb: 0.5 }}
                    >
                        Activity
                    </Typography>
                    <Typography
                        sx={{
                            color: "var(--fg-faint)",
                            fontSize: "0.85rem",
                            mb: 2.5,
                        }}
                    >
                        How your app is being used by signed-in users.
                    </Typography>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr 1fr",
                                sm: "repeat(4, 1fr)",
                            },
                            gap: 2,
                            mb: 3,
                        }}
                    >
                        <StatTile
                            label="Total sign-ins"
                            value={stats.total_sign_ins.toLocaleString()}
                        />
                        <StatTile
                            label="Unique users"
                            value={stats.unique_users.toLocaleString()}
                        />
                        <StatTile
                            label="Active sessions"
                            value={stats.active_sessions.toLocaleString()}
                        />
                        <StatTile
                            label="API requests"
                            value={stats.request_count.toLocaleString()}
                        />
                    </Box>

                    <Typography
                        sx={{
                            color: "var(--fg-faint)",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            mb: 1.5,
                        }}
                    >
                        Sign-ins · last 30 days
                    </Typography>
                    {stats.sign_in_timeline.length === 0 ? (
                        <Typography
                            sx={{
                                color: "var(--fg-faint)",
                                fontStyle: "italic",
                                fontSize: "0.9rem",
                                py: 3,
                                textAlign: "center",
                            }}
                        >
                            No sign-ins yet.
                        </Typography>
                    ) : (
                        <SignInBars
                            points={stats.sign_in_timeline}
                            height={120}
                        />
                    )}

                    <Box
                        sx={{
                            mt: 2.5,
                            pt: 2,
                            borderTop: "1px solid var(--border)",
                            display: "flex",
                            gap: 2,
                            flexWrap: "wrap",
                            color: "var(--fg-faint)",
                            fontSize: "0.8rem",
                        }}
                    >
                        <span>
                            Last used:{" "}
                            <strong style={{ color: "var(--fg)" }}>
                                {stats.last_used
                                    ? new Date(stats.last_used).toLocaleString()
                                    : "Never"}
                            </strong>
                        </span>
                        <span>•</span>
                        <span>
                            Webhooks:{" "}
                            <strong style={{ color: "var(--fg)" }}>
                                {stats.webhooks.total_endpoints === 0
                                    ? "none configured"
                                    : `${stats.webhooks.active_endpoints}/${stats.webhooks.total_endpoints} active${
                                          stats.webhooks.last_delivery_at
                                              ? `, last delivery ${new Date(stats.webhooks.last_delivery_at).toLocaleString()}`
                                              : ", never delivered"
                                      }`}
                            </strong>
                        </span>
                    </Box>
                </Box>
            )}

            {/* Webhooks panel — multi-endpoint event subscription */}
            <Box sx={{ ...cardSx, mb: 3 }}>
                <Typography
                    sx={{ color: "var(--fg)", fontWeight: 600, mb: 0.5 }}
                >
                    Webhook endpoints
                </Typography>
                <Typography
                    sx={{
                        color: "var(--fg-faint)",
                        fontSize: "0.85rem",
                        mb: 2.5,
                    }}
                >
                    Register one or more URLs that receive signed event
                    deliveries. Each endpoint has its own secret. Useful for
                    separating localhost/staging/production receivers, each
                    listening to a different subset of events. See the{" "}
                    <a
                        href="https://github.com/elixpo/accounts.elixpo/blob/main/docs/WEBHOOKS_APP_SUBSCRIPTION.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: "#ff7759",
                            textDecoration: "underline",
                            textDecorationColor: "rgba(255, 119, 89,0.4)",
                        }}
                    >
                        integration guide
                    </a>{" "}
                    for the signature contract.
                </Typography>

                {/* Result message */}
                {webhookMessage && (
                    <Typography
                        sx={{
                            mb: 2,
                            color:
                                webhookMessage.type === "error"
                                    ? "#b91c1c"
                                    : "#15803d",
                            fontSize: "0.85rem",
                        }}
                    >
                        {webhookMessage.text}
                    </Typography>
                )}

                {/* Existing endpoints list */}
                {endpointsLoading ? (
                    <Box
                        sx={{
                            py: 3,
                            textAlign: "center",
                            color: "var(--fg-faint)",
                        }}
                    >
                        <CircularProgress size={20} sx={{ color: "#ff7759" }} />
                    </Box>
                ) : endpoints.length === 0 ? (
                    <Box
                        sx={{
                            py: 3,
                            px: 2,
                            mb: 2.5,
                            textAlign: "center",
                            borderRadius: "10px",
                            background: "var(--surface)",
                            border: "1px dashed var(--border)",
                            color: "var(--fg-faint)",
                            fontSize: "0.88rem",
                        }}
                    >
                        No endpoints yet — add one below.
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                            mb: 3,
                        }}
                    >
                        {endpoints.map((ep) => (
                            <EndpointRow
                                key={ep.id}
                                ep={ep}
                                revealedSecret={revealedSecrets[ep.id]}
                                onDismissSecret={() =>
                                    setRevealedSecrets((s) => {
                                        const copy = { ...s };
                                        delete copy[ep.id];
                                        return copy;
                                    })
                                }
                                onCopySecret={() =>
                                    copyToClipboard(
                                        revealedSecrets[ep.id] || "",
                                        `endpoint-${ep.id}`,
                                    )
                                }
                                copiedField={copiedField}
                                busy={endpointBusy === ep.id}
                                onToggle={() =>
                                    handleToggleEndpoint(ep, !ep.is_active)
                                }
                                onDelete={() => handleDeleteEndpoint(ep)}
                                onRotate={() => handleRotateEndpoint(ep)}
                            />
                        ))}
                    </Box>
                )}

                {/* Add-endpoint inline form */}
                <Box
                    sx={{
                        p: 2.5,
                        borderRadius: "12px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                    }}
                >
                    <Typography
                        sx={{
                            color: "var(--fg)",
                            fontWeight: 600,
                            fontSize: "0.92rem",
                            mb: 1.5,
                        }}
                    >
                        Add new endpoint
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "2fr 1fr",
                            },
                            gap: 1.5,
                            mb: 1.5,
                        }}
                    >
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="https://yourapp.com/api/webhooks/elixpo"
                            value={newEndpoint.url}
                            onChange={(e) =>
                                setNewEndpoint((p) => ({
                                    ...p,
                                    url: e.target.value,
                                }))
                            }
                            InputProps={{
                                sx: {
                                    color: "var(--fg)",
                                    fontFamily:
                                        "var(--font-geist-mono), monospace",
                                    fontSize: "0.82rem",
                                },
                            }}
                            sx={textFieldSx}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Label (e.g. production)"
                            value={newEndpoint.label}
                            onChange={(e) =>
                                setNewEndpoint((p) => ({
                                    ...p,
                                    label: e.target.value,
                                }))
                            }
                            InputProps={{
                                sx: {
                                    color: "var(--fg)",
                                    fontSize: "0.85rem",
                                },
                            }}
                            sx={textFieldSx}
                        />
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 0.75,
                            flexWrap: "wrap",
                            mb: 1.5,
                        }}
                    >
                        {WEBHOOK_EVENTS.map((ev) => {
                            const checked = newEndpoint.events.includes(ev);
                            return (
                                <Chip
                                    key={ev}
                                    label={ev}
                                    size="small"
                                    onClick={() =>
                                        setNewEndpoint((p) => ({
                                            ...p,
                                            events: checked
                                                ? p.events.filter(
                                                      (e) => e !== ev,
                                                  )
                                                : [...p.events, ev],
                                        }))
                                    }
                                    sx={{
                                        cursor: "pointer",
                                        fontFamily:
                                            "var(--font-geist-mono), monospace",
                                        fontSize: "0.72rem",
                                        bgcolor: checked
                                            ? "rgba(255, 119, 89,0.15)"
                                            : "var(--overlay)",
                                        color: checked
                                            ? "#ff7759"
                                            : "var(--fg-faint)",
                                        border: `1px solid ${
                                            checked
                                                ? "rgba(255, 119, 89,0.4)"
                                                : "var(--border)"
                                        }`,
                                    }}
                                />
                            );
                        })}
                    </Box>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleCreateEndpoint}
                        disabled={creatingEndpoint}
                        sx={{
                            textTransform: "none",
                            background:
                                "linear-gradient(135deg, #ff7759 0%, #ff7759 100%)",
                            "&:hover": {
                                background:
                                    "linear-gradient(135deg, #ff7759 0%, #ff7759 100%)",
                            },
                        }}
                    >
                        {creatingEndpoint ? "Adding…" : "Add endpoint"}
                    </Button>
                </Box>
            </Box>

            {/* Save Button */}
            <Box sx={{ mb: 3 }}>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                        background: "rgba(255, 119, 89,0.15)",
                        color: "#ff7759",
                        border: "1px solid rgba(255, 119, 89,0.3)",
                        fontWeight: 600,
                        textTransform: "none",
                        "&:hover": { background: "rgba(255, 119, 89,0.25)" },
                    }}
                >
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </Box>

            {/* Danger Zone */}
            <Box sx={{ ...cardSx, border: "1px solid rgba(239,68,68,0.3)" }}>
                <Typography sx={{ color: "#b91c1c", fontWeight: 600, mb: 1 }}>
                    Danger Zone
                </Typography>
                <Divider sx={{ borderColor: "rgba(239,68,68,0.15)", mb: 2 }} />
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Box>
                        <Typography
                            sx={{ color: "var(--fg)", fontWeight: 500 }}
                        >
                            Delete application
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ color: "var(--fg-faint)" }}
                        >
                            Permanently delete this app and revoke all issued
                            tokens
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        onClick={handleDelete}
                        sx={{
                            borderColor: "rgba(239,68,68,0.4)",
                            color: "#b91c1c",
                            textTransform: "none",
                            "&:hover": {
                                bgcolor: "rgba(239,68,68,0.1)",
                                borderColor: "#ef4444",
                            },
                        }}
                    >
                        Delete
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}

function StatTile({ label, value }: { label: string; value: string }) {
    return (
        <Box
            sx={{
                p: 2,
                borderRadius: "12px",
                bgcolor: "var(--surface)",
                border: "1px solid var(--border)",
            }}
        >
            <Typography
                sx={{
                    color: "var(--fg-faint)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    mb: 0.5,
                }}
            >
                {label}
            </Typography>
            <Typography
                sx={{
                    color: "var(--fg)",
                    fontWeight: 700,
                    fontSize: "1.5rem",
                    fontVariantNumeric: "tabular-nums",
                }}
            >
                {value}
            </Typography>
        </Box>
    );
}

function EndpointRow({
    ep,
    revealedSecret,
    onDismissSecret,
    onCopySecret,
    copiedField,
    busy,
    onToggle,
    onDelete,
    onRotate,
}: {
    ep: {
        id: string;
        url: string;
        events: string[];
        is_active: boolean;
        label: string | null;
        secret_set_at: string;
        last_delivery_at: string | null;
        last_status_code: number | null;
        last_error: string | null;
    };
    revealedSecret: string | undefined;
    onDismissSecret: () => void;
    onCopySecret: () => void;
    copiedField: string | null;
    busy: boolean;
    onToggle: () => void;
    onDelete: () => void;
    onRotate: () => void;
}) {
    const statusOk =
        ep.last_status_code !== null &&
        ep.last_status_code >= 200 &&
        ep.last_status_code < 300;
    return (
        <Box
            sx={{
                p: 2,
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                opacity: ep.is_active ? 1 : 0.55,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    mb: 1,
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 0.5,
                            flexWrap: "wrap",
                        }}
                    >
                        {ep.label && (
                            <Chip
                                label={ep.label}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: "rgba(255, 119, 89,0.12)",
                                    color: "#ff7759",
                                    border: "1px solid rgba(255, 119, 89,0.3)",
                                }}
                            />
                        )}
                        <Chip
                            label={ep.is_active ? "Active" : "Paused"}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: "0.7rem",
                                bgcolor: ep.is_active
                                    ? "rgba(134,239,172,0.08)"
                                    : "var(--overlay)",
                                color: ep.is_active
                                    ? "#15803d"
                                    : "var(--fg-faint)",
                                border: `1px solid ${
                                    ep.is_active
                                        ? "rgba(134,239,172,0.2)"
                                        : "var(--border)"
                                }`,
                            }}
                        />
                        {ep.last_status_code !== null && (
                            <Chip
                                label={`HTTP ${ep.last_status_code}`}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                    fontFamily:
                                        "var(--font-geist-mono), monospace",
                                    bgcolor: statusOk
                                        ? "rgba(134,239,172,0.08)"
                                        : "rgba(239,68,68,0.1)",
                                    color: statusOk ? "#15803d" : "#b91c1c",
                                    border: `1px solid ${
                                        statusOk
                                            ? "rgba(134,239,172,0.2)"
                                            : "rgba(239,68,68,0.25)"
                                    }`,
                                }}
                            />
                        )}
                    </Box>
                    <Box
                        component="code"
                        sx={{
                            display: "block",
                            color: "var(--fg)",
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontSize: "0.82rem",
                            wordBreak: "break-all",
                            mb: 0.5,
                        }}
                    >
                        {ep.url}
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 0.5,
                            flexWrap: "wrap",
                        }}
                    >
                        {ep.events.map((e) => (
                            <Box
                                key={e}
                                component="span"
                                sx={{
                                    fontFamily:
                                        "var(--font-geist-mono), monospace",
                                    fontSize: "0.7rem",
                                    color: "var(--fg-faint)",
                                    bgcolor: "var(--overlay)",
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: "4px",
                                }}
                            >
                                {e}
                            </Box>
                        ))}
                    </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                    <Tooltip
                        title={ep.is_active ? "Pause deliveries" : "Resume"}
                    >
                        <span>
                            <IconButton
                                size="small"
                                onClick={onToggle}
                                disabled={busy}
                                sx={{ color: "var(--fg-faint)" }}
                            >
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Rotate secret">
                        <span>
                            <IconButton
                                size="small"
                                onClick={onRotate}
                                disabled={busy}
                                sx={{ color: "var(--fg-faint)" }}
                            >
                                <RefreshIcon
                                    fontSize="small"
                                    sx={{ transform: "rotate(45deg)" }}
                                />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Delete endpoint">
                        <span>
                            <IconButton
                                size="small"
                                onClick={onDelete}
                                disabled={busy}
                                sx={{ color: "#b91c1c" }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>
            <Box
                sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    pt: 1,
                    mt: 1,
                    borderTop: "1px solid var(--border)",
                    fontSize: "0.74rem",
                    color: "var(--fg-faint)",
                }}
            >
                <span>
                    Secret set:{" "}
                    {new Date(ep.secret_set_at).toLocaleDateString()}
                </span>
                <span>
                    Last delivery:{" "}
                    {ep.last_delivery_at
                        ? new Date(ep.last_delivery_at).toLocaleString()
                        : "never"}
                </span>
                {ep.last_error && (
                    <span style={{ color: "#b91c1c" }}>
                        Last error: {ep.last_error}
                    </span>
                )}
            </Box>

            {revealedSecret && (
                <Box
                    sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: "10px",
                        background:
                            "linear-gradient(135deg, rgba(255, 119, 89,0.12) 0%, rgba(255, 119, 89,0.05) 100%)",
                        border: "1px solid rgba(255, 119, 89,0.35)",
                    }}
                >
                    <Typography
                        sx={{
                            color: "#b45309",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            mb: 1,
                        }}
                    >
                        Copy this secret now — it won&apos;t be shown again
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            background: "var(--overlay)",
                            borderRadius: "8px",
                            p: 1.25,
                        }}
                    >
                        <Box
                            component="code"
                            sx={{
                                color: "var(--fg)",
                                fontFamily: "var(--font-geist-mono), monospace",
                                fontSize: "0.82rem",
                                wordBreak: "break-all",
                                flex: 1,
                            }}
                        >
                            {revealedSecret}
                        </Box>
                        <Button
                            size="small"
                            onClick={onCopySecret}
                            sx={{
                                textTransform: "none",
                                color: "#ff7759",
                                minWidth: 0,
                            }}
                        >
                            {copiedField === `endpoint-${ep.id}`
                                ? "Copied"
                                : "Copy"}
                        </Button>
                    </Box>
                    <Button
                        size="small"
                        onClick={onDismissSecret}
                        sx={{
                            mt: 1,
                            textTransform: "none",
                            color: "var(--fg-faint)",
                        }}
                    >
                        I&apos;ve saved it
                    </Button>
                </Box>
            )}
        </Box>
    );
}

function SignInBars({
    points,
    height = 120,
}: {
    points: Array<{ date: string; count: number }>;
    height?: number;
}) {
    const max = Math.max(1, ...points.map((p) => p.count));
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: "4px",
                height,
            }}
        >
            {points.map((p) => (
                <Box
                    key={p.date}
                    title={`${p.date}: ${p.count}`}
                    sx={{
                        flex: "1 1 0",
                        maxWidth: 36,
                        height: `${Math.max((p.count / max) * 100, 4)}%`,
                        borderRadius: "3px 3px 0 0",
                        background:
                            "linear-gradient(180deg, rgba(255, 119, 89,0.95) 0%, rgba(255, 119, 89,0.55) 100%)",
                        transition: "filter 0.15s ease",
                        "&:hover": { filter: "brightness(1.25)" },
                    }}
                />
            ))}
        </Box>
    );
}
