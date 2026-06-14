"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import SettingsIcon from "@mui/icons-material/Settings";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const AVAILABLE_EVENTS = [
    { value: "user.created", label: "User Created" },
    { value: "user.updated", label: "User Updated" },
    { value: "user.deleted", label: "User Deleted" },
    { value: "oauth.authorized", label: "OAuth Authorized" },
    { value: "oauth.revoked", label: "OAuth Revoked" },
    { value: "api_key.created", label: "API Key Created" },
    { value: "api_key.revoked", label: "API Key Revoked" },
];

interface Webhook {
    id: string;
    url: string;
    events: string[];
    is_active: boolean;
    created_at: string;
    last_delivery_at?: string;
}

const cardSx = {
    backdropFilter: "blur(20px)",
    background:
        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "16px",
};

const dialogSx = {
    backdropFilter: "blur(20px)",
    background:
        "linear-gradient(135deg, rgba(22,28,24,0.97) 0%, rgba(20,24,20,0.97) 100%)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "16px",
};

const textFieldSx = {
    "& .MuiOutlinedInput-root": {
        color: "#f5f5f4",
        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
        "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
        "&.Mui-focused fieldset": { borderColor: "#9b7bf7" },
    },
    "& .MuiInputLabel-root": { color: "rgba(255, 255, 255, 0.7)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#9b7bf7" },
    "& .MuiFormHelperText-root": { color: "rgba(255,255,255,0.5)" },
};

export default function WebhooksPage() {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [snack, setSnack] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    const [form, setForm] = useState({
        client_id: "",
        events: [] as string[],
        secret: "",
    });

    // Apps the caller owns AND that have a webhook_url configured. Only
    // these are valid destinations per the safety policy (the URL is
    // resolved server-side from the chosen app, no free-text URLs).
    interface OwnedApp {
        client_id: string;
        name: string;
        webhook_url: string | null;
    }
    const [ownedApps, setOwnedApps] = useState<OwnedApp[]>([]);
    const eligibleApps = ownedApps.filter((a) => !!a.webhook_url);
    const selectedApp = eligibleApps.find(
        (a) => a.client_id === form.client_id,
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps

    // useCallback gives a stable reference so the effect doesn't loop when
    // eslint-react-hooks puts fetchWebhooks in deps.
    const fetchWebhooks = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/auth/webhooks", {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch webhooks");
            const data: any = await res.json();
            setWebhooks(data.webhooks || []);
        } catch {
            setSnack({
                open: true,
                message: "Failed to load webhooks",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWebhooks();
    }, [fetchWebhooks]);

    const showSnack = (message: string, severity: "success" | "error") => {
        setSnack({ open: true, message, severity });
    };

    const handleEventToggle = (event: string) => {
        setForm((prev) => ({
            ...prev,
            events: prev.events.includes(event)
                ? prev.events.filter((e) => e !== event)
                : [...prev.events, event],
        }));
    };

    const handleCreate = async () => {
        if (!form.client_id)
            return showSnack("Pick a connected app", "error");
        if (form.events.length === 0)
            return showSnack("Select at least one event", "error");

        setCreating(true);
        try {
            const res = await fetch("/api/auth/webhooks", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: form.client_id,
                    events: form.events,
                    secret: form.secret || undefined,
                }),
            });
            if (!res.ok) {
                const err: any = await res.json();
                throw new Error(err.error || "Failed to create webhook");
            }
            setOpenDialog(false);
            setForm({ client_id: "", events: [], secret: "" });
            await fetchWebhooks();
            showSnack("Webhook created successfully", "success");
        } catch (err: any) {
            showSnack(err.message, "error");
        } finally {
            setCreating(false);
        }
    };

    // Load the caller's OAuth apps once on mount. We use the existing
    // /api/auth/oauth-apps endpoint which lists apps owned by the user.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/auth/oauth-apps", {
                    credentials: "include",
                });
                if (!res.ok) return;
                const data: any = await res.json();
                if (cancelled) return;
                const apps = (data.apps || []) as Array<{
                    client_id: string;
                    name: string;
                    webhook_url?: string | null;
                }>;
                setOwnedApps(
                    apps.map((a) => ({
                        client_id: a.client_id,
                        name: a.name,
                        webhook_url: a.webhook_url ?? null,
                    })),
                );
            } catch {
                /* non-fatal — the dropdown just shows no options */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this webhook? This cannot be undone.")) return;
        try {
            const res = await fetch(`/api/auth/webhooks/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete");
            await fetchWebhooks();
            showSnack("Webhook deleted", "success");
        } catch {
            showSnack("Failed to delete webhook", "error");
        }
    };

    const handleTest = async (id: string) => {
        try {
            const res = await fetch(`/api/auth/webhooks/${id}/test`, {
                method: "POST",
                credentials: "include",
            });
            const data: any = await res.json();
            if (data.success) {
                showSnack(
                    `Test delivered (HTTP ${data.statusCode})`,
                    "success",
                );
            } else {
                showSnack(`Test failed: ${data.message}`, "error");
            }
        } catch {
            showSnack("Failed to send test", "error");
        }
    };

    const handleToggleActive = async (webhook: Webhook) => {
        try {
            const res = await fetch(`/api/auth/webhooks/${webhook.id}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !webhook.is_active }),
            });
            if (!res.ok) throw new Error("Failed to update");
            setWebhooks((prev) =>
                prev.map((w) =>
                    w.id === webhook.id ? { ...w, is_active: !w.is_active } : w,
                ),
            );
        } catch {
            showSnack("Failed to update webhook", "error");
        }
    };

    return (
        <Box>
            <Box sx={{ maxWidth: "1100px", mx: "auto" }}>
                {/* Header */}
                <Box
                    sx={{
                        mb: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                    }}
                >
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{ fontWeight: 700, color: "#f5f5f4", mb: 1 }}
                        >
                            Webhooks
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
                            Receive real-time HTTP notifications for platform
                            events
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenDialog(true)}
                        sx={{
                            background: "rgba(155, 123, 247,0.15)",
                            color: "#9b7bf7",
                            border: "1px solid rgba(155, 123, 247,0.3)",
                            fontWeight: 600,
                            textTransform: "none",
                            "&:hover": {
                                background: "rgba(155, 123, 247,0.25)",
                            },
                        }}
                    >
                        Add Webhook
                    </Button>
                </Box>

                {/* Table */}
                <Box sx={cardSx}>
                    {loading ? (
                        <Box sx={{ p: 4, textAlign: "center" }}>
                            <CircularProgress sx={{ color: "#9b7bf7" }} />
                        </Box>
                    ) : webhooks.length === 0 ? (
                        <Box
                            sx={{
                                p: 4,
                                textAlign: "center",
                                color: "rgba(255,255,255,0.4)",
                            }}
                        >
                            No webhooks configured yet. Click "Add Webhook" to
                            get started.
                        </Box>
                    ) : (
                        <TableContainer
                            component={Paper}
                            sx={{
                                background: "transparent",
                                boxShadow: "none",
                            }}
                        >
                            <Table>
                                <TableHead>
                                    <TableRow
                                        sx={{
                                            "& .MuiTableCell-head": {
                                                color: "#9b7bf7",
                                                fontWeight: 600,
                                                bgcolor:
                                                    "rgba(155, 123, 247,0.05)",
                                                borderColor:
                                                    "rgba(155, 123, 247,0.2)",
                                            },
                                        }}
                                    >
                                        <TableCell>URL</TableCell>
                                        <TableCell>Events</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Last Delivery</TableCell>
                                        <TableCell align="right">
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {webhooks.map((webhook) => (
                                        <TableRow
                                            key={webhook.id}
                                            sx={{
                                                "& .MuiTableCell-body": {
                                                    color: "#f5f5f4",
                                                    borderColor:
                                                        "rgba(255,255,255,0.08)",
                                                },
                                                "&:hover": {
                                                    bgcolor:
                                                        "rgba(255,255,255,0.02)",
                                                },
                                            }}
                                        >
                                            <TableCell sx={{ maxWidth: 300 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontFamily: "monospace",
                                                        fontSize: "0.8rem",
                                                        wordBreak: "break-all",
                                                    }}
                                                >
                                                    {webhook.url}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    {webhook.events.map(
                                                        (ev) => (
                                                            <Chip
                                                                key={ev}
                                                                label={ev}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor:
                                                                        "rgba(155, 123, 247,0.1)",
                                                                    color: "#9b7bf7",
                                                                    fontSize:
                                                                        "0.7rem",
                                                                    height: 20,
                                                                }}
                                                            />
                                                        ),
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={webhook.is_active}
                                                    onChange={() =>
                                                        handleToggleActive(
                                                            webhook,
                                                        )
                                                    }
                                                    size="small"
                                                    sx={{
                                                        "& .MuiSwitch-switchBase.Mui-checked":
                                                            {
                                                                color: "#9b7bf7",
                                                            },
                                                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                                            {
                                                                bgcolor:
                                                                    "#65a30d",
                                                            },
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: "rgba(255,255,255,0.5)",
                                                    fontSize: "0.85rem",
                                                }}
                                            >
                                                {webhook.last_delivery_at
                                                    ? new Date(
                                                          webhook.last_delivery_at,
                                                      ).toLocaleString()
                                                    : "Never"}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 0.5,
                                                        justifyContent:
                                                            "flex-end",
                                                    }}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        title="Send test"
                                                        onClick={() =>
                                                            handleTest(
                                                                webhook.id,
                                                            )
                                                        }
                                                        sx={{
                                                            color: "#9b7bf7",
                                                            "&:hover": {
                                                                bgcolor:
                                                                    "rgba(155, 123, 247,0.1)",
                                                            },
                                                        }}
                                                    >
                                                        <SendIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        title="Settings"
                                                        component={Link}
                                                        href={`/dashboard/webhooks/${webhook.id}`}
                                                        sx={{
                                                            color: "rgba(255,255,255,0.5)",
                                                            "&:hover": {
                                                                color: "#fff",
                                                                bgcolor:
                                                                    "rgba(255,255,255,0.05)",
                                                            },
                                                        }}
                                                    >
                                                        <SettingsIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        title="Delete"
                                                        onClick={() =>
                                                            handleDelete(
                                                                webhook.id,
                                                            )
                                                        }
                                                        sx={{
                                                            color: "#ef4444",
                                                            "&:hover": {
                                                                bgcolor:
                                                                    "rgba(239,68,68,0.1)",
                                                            },
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </Box>

            {/* Create Dialog */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: dialogSx }}
            >
                <DialogTitle
                    sx={{
                        color: "#f5f5f4",
                        fontWeight: 700,
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                >
                    Add Webhook
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {/* Connected-app dropdown — replaces the old free-text
                        Payload URL. Per the safety policy the URL is
                        resolved from the chosen app's registered
                        webhook_url, so we never send to arbitrary hosts. */}
                    <FormControl
                        fullWidth
                        margin="dense"
                        sx={{
                            ...textFieldSx,
                            "& .MuiInputLabel-root": {
                                color: "rgba(255,255,255,0.7)",
                            },
                            "& .MuiInputLabel-root.Mui-focused": {
                                color: "#9b7bf7",
                            },
                            "& .MuiOutlinedInput-root": {
                                color: "#f5f5f4",
                                "& fieldset": {
                                    borderColor: "rgba(255,255,255,0.15)",
                                },
                                "&:hover fieldset": {
                                    borderColor: "rgba(155,123,247,0.4)",
                                },
                                "&.Mui-focused fieldset": {
                                    borderColor: "#9b7bf7",
                                },
                            },
                            "& .MuiSelect-icon": {
                                color: "rgba(255,255,255,0.6)",
                            },
                        }}
                    >
                        <InputLabel id="wh-app-select">
                            Connected app
                        </InputLabel>
                        <Select
                            labelId="wh-app-select"
                            label="Connected app"
                            value={form.client_id}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    client_id: e.target.value as string,
                                })
                            }
                            displayEmpty
                            renderValue={(val) => {
                                if (!val)
                                    return (
                                        <Box
                                            component="span"
                                            sx={{
                                                color: "rgba(255,255,255,0.4)",
                                            }}
                                        >
                                            Choose one of your OAuth apps
                                        </Box>
                                    );
                                const app = eligibleApps.find(
                                    (a) => a.client_id === val,
                                );
                                return app?.name || (val as string);
                            }}
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        background: "rgba(20,22,30,0.97)",
                                        backdropFilter: "blur(20px)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#f5f5f4",
                                    },
                                },
                            }}
                        >
                            {eligibleApps.length === 0 ? (
                                <MenuItem disabled value="">
                                    No eligible apps — register an OAuth app
                                    with a webhook_url first
                                </MenuItem>
                            ) : (
                                eligibleApps.map((a) => (
                                    <MenuItem
                                        key={a.client_id}
                                        value={a.client_id}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                py: 0.25,
                                            }}
                                        >
                                            <Box
                                                component="span"
                                                sx={{ fontWeight: 600 }}
                                            >
                                                {a.name}
                                            </Box>
                                            <Box
                                                component="span"
                                                sx={{
                                                    fontFamily:
                                                        "var(--font-geist-mono), monospace",
                                                    fontSize: "0.72rem",
                                                    color: "rgba(255,255,255,0.5)",
                                                }}
                                            >
                                                {a.webhook_url}
                                            </Box>
                                        </Box>
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>

                    {/* Read-only echo of the resolved URL, so the user can
                        see exactly what they're committing to. */}
                    {selectedApp?.webhook_url && (
                        <Box
                            sx={{
                                mt: 1.5,
                                p: 1.25,
                                borderRadius: "8px",
                                background: "rgba(155,123,247,0.06)",
                                border: "1px solid rgba(155,123,247,0.2)",
                            }}
                        >
                            <Box
                                component="div"
                                sx={{
                                    color: "rgba(255,255,255,0.45)",
                                    fontSize: "0.7rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    mb: 0.25,
                                }}
                            >
                                Payload will be sent to
                            </Box>
                            <Box
                                component="code"
                                sx={{
                                    color: "#c8b6ff",
                                    fontFamily:
                                        "var(--font-geist-mono), monospace",
                                    fontSize: "0.82rem",
                                    wordBreak: "break-all",
                                }}
                            >
                                {selectedApp.webhook_url}
                            </Box>
                        </Box>
                    )}
                    <TextField
                        fullWidth
                        label="Secret (optional)"
                        placeholder="Auto-generated if empty"
                        value={form.secret}
                        onChange={(e) =>
                            setForm({ ...form, secret: e.target.value })
                        }
                        margin="dense"
                        helperText="Used to sign payloads (X-Elixpo-Signature header)"
                        sx={textFieldSx}
                    />
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.7)",
                            mt: 2,
                            mb: 1,
                            fontSize: "0.9rem",
                            fontWeight: 600,
                        }}
                    >
                        Events to listen for
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                        }}
                    >
                        {AVAILABLE_EVENTS.map((ev) => (
                            <FormControlLabel
                                key={ev.value}
                                control={
                                    <Checkbox
                                        checked={form.events.includes(ev.value)}
                                        onChange={() =>
                                            handleEventToggle(ev.value)
                                        }
                                        size="small"
                                        sx={{
                                            color: "rgba(255,255,255,0.3)",
                                            "&.Mui-checked": {
                                                color: "#9b7bf7",
                                            },
                                        }}
                                    />
                                }
                                label={
                                    <Typography
                                        sx={{
                                            color: "#e5e7eb",
                                            fontSize: "0.9rem",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontFamily: "monospace",
                                                color: "#9b7bf7",
                                                marginRight: 8,
                                            }}
                                        >
                                            {ev.value}
                                        </span>
                                        {ev.label}
                                    </Typography>
                                }
                            />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions
                    sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", p: 2 }}
                >
                    <Button
                        onClick={() => setOpenDialog(false)}
                        sx={{ color: "rgba(255,255,255,0.6)" }}
                        disabled={creating}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        variant="contained"
                        disabled={creating}
                        sx={{
                            background: "rgba(155, 123, 247,0.15)",
                            color: "#9b7bf7",
                            border: "1px solid rgba(155, 123, 247,0.3)",
                            "&:hover": {
                                background: "rgba(155, 123, 247,0.25)",
                            },
                        }}
                    >
                        {creating ? "Creating..." : "Add Webhook"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack({ ...snack, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    severity={snack.severity}
                    onClose={() => setSnack({ ...snack, open: false })}
                    sx={{
                        bgcolor:
                            snack.severity === "success"
                                ? "rgba(155, 123, 247,0.15)"
                                : "rgba(239,68,68,0.15)",
                        color:
                            snack.severity === "success"
                                ? "#9b7bf7"
                                : "#ef4444",
                        border: `1px solid ${snack.severity === "success" ? "rgba(155, 123, 247,0.3)" : "rgba(239,68,68,0.3)"}`,
                    }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
