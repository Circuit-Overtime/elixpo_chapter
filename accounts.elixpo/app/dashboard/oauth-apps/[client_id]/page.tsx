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
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    p: 3,
};

const textFieldSx = {
    "& .MuiOutlinedInput-root": {
        color: "#f5f5f4",
        "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
        "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
        "&.Mui-focused fieldset": { borderColor: "#a3e635" },
    },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#a3e635" },
    "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.4)" },
};

const monoBox = {
    display: "flex",
    alignItems: "center",
    gap: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(163,230,53,0.2)",
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
                <CircularProgress sx={{ color: "#a3e635" }} />
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
                    color: "rgba(255,255,255,0.5)",
                    mb: 2,
                    textTransform: "none",
                    "&:hover": { color: "#fff" },
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
                            bgcolor: "rgba(255,255,255,0.05)",
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
                            bgcolor: "rgba(163,230,53,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#a3e635",
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
                        sx={{ fontWeight: 700, color: "#f5f5f4" }}
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
                                color: "rgba(255,255,255,0.3)",
                                fontSize: "0.8rem",
                                textDecoration: "none",
                                fontFamily: "monospace",
                                "&:hover": { color: "#a3e635" },
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
                            color: "#9ca3af",
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
                                ? "rgba(163,230,53,0.1)"
                                : "rgba(239,68,68,0.1)",
                        color:
                            message.type === "success" ? "#a3e635" : "#ef4444",
                        border: `1px solid ${message.type === "success" ? "rgba(163,230,53,0.3)" : "rgba(239,68,68,0.3)"}`,
                        "& .MuiAlert-icon": {
                            color:
                                message.type === "success"
                                    ? "#a3e635"
                                    : "#ef4444",
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
                            color: "rgba(255,255,255,0.5)",
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
                                color: "#a3e635",
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
                                sx={{ color: "#a3e635" }}
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
                            color: "rgba(255,255,255,0.5)",
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
                                    border: "1px solid rgba(163,230,53,0.4)",
                                }}
                            >
                                <Typography
                                    sx={{
                                        color: "#a3e635",
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
                                        sx={{ color: "#a3e635" }}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "#a3e635",
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
                                        color: "#9ca3af",
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
                                        sx={{ color: "#a3e635" }}
                                    >
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "rgba(255,255,255,0.25)",
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
                        sx={{ color: "#f5f5f4", fontWeight: 600, mb: 2 }}
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
                        sx={{ color: "#f5f5f4", fontWeight: 600, mb: 0.5 }}
                    >
                        Redirect URIs
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            color: "rgba(255,255,255,0.35)",
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
                                        color: "#ef4444",
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
                                color: "#a3e635",
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
                        sx={{ color: "#f5f5f4", fontWeight: 600, mb: 2 }}
                    >
                        Info
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.5)",
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
                                        bgcolor: "rgba(163,230,53,0.1)",
                                        color: "#a3e635",
                                        border: "1px solid rgba(163,230,53,0.2)",
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>

                    {app?.request_count !== undefined && (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: "0.8rem",
                                    mb: 0.25,
                                }}
                            >
                                Requests
                            </Typography>
                            <Typography
                                sx={{
                                    color: "#f5f5f4",
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
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: "0.8rem",
                                    mb: 0.25,
                                }}
                            >
                                Created
                            </Typography>
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.6)",
                                    fontSize: "0.9rem",
                                }}
                            >
                                {new Date(app.created_at).toLocaleDateString()}
                            </Typography>
                        </Box>
                    )}
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
                        background: "rgba(163,230,53,0.15)",
                        color: "#a3e635",
                        border: "1px solid rgba(163,230,53,0.3)",
                        fontWeight: 600,
                        textTransform: "none",
                        "&:hover": { background: "rgba(163,230,53,0.25)" },
                    }}
                >
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </Box>

            {/* Danger Zone */}
            <Box sx={{ ...cardSx, border: "1px solid rgba(239,68,68,0.3)" }}>
                <Typography sx={{ color: "#ef4444", fontWeight: 600, mb: 1 }}>
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
                        <Typography sx={{ color: "#f5f5f4", fontWeight: 500 }}>
                            Delete application
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ color: "rgba(255,255,255,0.4)" }}
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
                            color: "#ef4444",
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
