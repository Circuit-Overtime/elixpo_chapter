"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import KeyIcon from "@mui/icons-material/Key";
import LaptopIcon from "@mui/icons-material/Laptop";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import SecurityIcon from "@mui/icons-material/Security";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from "@mui/material";
import {
    browserSupportsWebAuthn,
    startRegistration,
} from "@simplewebauthn/browser";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

interface Factor {
    id: string;
    kind: "passkey" | "totp" | "email_otp";
    name: string | null;
    created_at: string;
    confirmed: boolean;
    last_used_at: string | null;
}
interface TrustedDevice {
    id: string;
    name: string | null;
    ua_short: string | null;
    last_seen_at: string;
    created_at: string;
    is_active: boolean;
}
interface Session {
    id: string;
    device: string;
    ip_hash: string | null;
    created_at: string;
    last_used_at: string;
    expires_at: string;
    is_current: boolean;
}
interface MeStatus {
    mfa_enabled: boolean;
    unused_backup_codes: number;
    owned_apps_count: number;
    mfa_required: boolean;
    factors: Factor[];
}

const cardSx = {
    p: 3,
    borderRadius: "16px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
};

const kindLabel: Record<Factor["kind"], string> = {
    passkey: "Passkey",
    totp: "Authenticator app",
    email_otp: "Email code",
};
const kindIcon: Record<Factor["kind"], React.ReactNode> = {
    passkey: <KeyIcon fontSize="small" sx={{ color: "#9b7bf7" }} />,
    totp: <PhoneAndroidIcon fontSize="small" sx={{ color: "#9b7bf7" }} />,
    email_otp: <MailOutlineIcon fontSize="small" sx={{ color: "#9b7bf7" }} />,
};

export default function SecurityPage() {
    const [status, setStatus] = useState<MeStatus | null>(null);
    const [devices, setDevices] = useState<TrustedDevice[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<{
        text: string;
        type: "success" | "error" | "warning";
    } | null>(null);

    // TOTP enrollment state.
    const [totpDialog, setTotpDialog] = useState(false);
    const [totpData, setTotpData] = useState<{
        factor_id: string;
        secret: string;
        otpauth_uri: string;
        qr_dataurl: string;
    } | null>(null);
    const [totpCode, setTotpCode] = useState("");
    const [totpBusy, setTotpBusy] = useState(false);

    // Freshly minted backup codes (revealed once).
    const [revealedCodes, setRevealedCodes] = useState<string[] | null>(null);

    // Regenerate-backup-codes confirmation modal — replaces native
    // confirm() so it matches the rest of the dashboard styling and
    // can show enough context (current unused count, consequences)
    // for the user to make an informed call.
    const [regenDialog, setRegenDialog] = useState(false);
    const [regenBusy, setRegenBusy] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const [factorsRes, devicesRes, sessionsRes] = await Promise.all([
                fetch("/api/auth/mfa/factors", { credentials: "include" }),
                fetch("/api/auth/devices", { credentials: "include" }),
                fetch("/api/auth/sessions", { credentials: "include" }),
            ]);
            if (factorsRes.ok) {
                const data: any = await factorsRes.json();
                setStatus(data);
            }
            if (devicesRes.ok) {
                const data: any = await devicesRes.json();
                setDevices(data.devices || []);
            }
            if (sessionsRes.ok) {
                const data: any = await sessionsRes.json();
                setSessions(data.sessions || []);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const startTotp = async () => {
        setMsg(null);
        const res = await fetch("/api/auth/mfa/totp/enroll", {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) {
            const e: any = await res.json();
            setMsg({
                text: e.error || "Failed to start enrollment",
                type: "error",
            });
            return;
        }
        const data: any = await res.json();
        const qr = await QRCode.toDataURL(data.otpauth_uri, {
            margin: 1,
            width: 240,
            color: { dark: "#f5f5f4", light: "#161c18" },
        });
        setTotpData({ ...data, qr_dataurl: qr });
        setTotpCode("");
        setTotpDialog(true);
    };

    const confirmTotp = async () => {
        if (!totpData) return;
        setTotpBusy(true);
        try {
            const res = await fetch("/api/auth/mfa/totp/confirm", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    factor_id: totpData.factor_id,
                    code: totpCode,
                }),
            });
            if (!res.ok) {
                const e: any = await res.json();
                setMsg({ text: e.error || "Invalid code", type: "error" });
                return;
            }
            setTotpDialog(false);
            setTotpData(null);
            setMsg({ text: "Authenticator app enrolled", type: "success" });
            await refresh();
        } finally {
            setTotpBusy(false);
        }
    };

    const enrollPasskey = async () => {
        if (!browserSupportsWebAuthn()) {
            setMsg({
                text: "This browser doesn't support passkeys.",
                type: "error",
            });
            return;
        }
        setMsg(null);
        try {
            const optsRes = await fetch(
                "/api/auth/mfa/passkey/register/options",
                { method: "POST", credentials: "include" },
            );
            if (!optsRes.ok) throw new Error("Failed to get options");
            const opts: any = await optsRes.json();
            const attResp = await startRegistration({ optionsJSON: opts });
            const verifyRes = await fetch(
                "/api/auth/mfa/passkey/register/verify",
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ response: attResp }),
                },
            );
            if (!verifyRes.ok) {
                const e: any = await verifyRes.json();
                setMsg({
                    text: e.error || "Passkey verification failed",
                    type: "error",
                });
                return;
            }
            setMsg({ text: "Passkey enrolled", type: "success" });
            await refresh();
        } catch (err: any) {
            setMsg({
                text: err?.message || "Passkey enrollment cancelled",
                type: "error",
            });
        }
    };

    const enrollEmailOtp = async () => {
        setMsg(null);
        const res = await fetch("/api/auth/mfa/email-otp/enable", {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) {
            const e: any = await res.json();
            setMsg({ text: e.error || "Failed to enable", type: "error" });
            return;
        }
        setMsg({ text: "Email OTP enabled as a 2FA method", type: "success" });
        await refresh();
    };

    const removeFactor = async (id: string) => {
        if (!confirm("Remove this 2FA method?")) return;
        const res = await fetch(`/api/auth/mfa/factors/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!res.ok) {
            const e: any = await res.json();
            setMsg({ text: e.error || "Remove failed", type: "error" });
            return;
        }
        await refresh();
    };

    const enableMfa = async () => {
        const res = await fetch("/api/auth/mfa/enable", {
            method: "POST",
            credentials: "include",
        });
        const data: any = await res.json();
        if (!res.ok) {
            setMsg({ text: data.error || "Enable failed", type: "error" });
            return;
        }
        setRevealedCodes(data.backup_codes);
        setMsg({
            text: "2FA enabled — copy your backup codes below.",
            type: "success",
        });
        await refresh();
    };

    const disableMfa = async () => {
        if (
            !confirm(
                "Disable 2FA? Your enrolled methods stay but won't be required at login.",
            )
        )
            return;
        const res = await fetch("/api/auth/mfa/disable", {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) {
            const e: any = await res.json();
            setMsg({ text: e.error || "Disable failed", type: "error" });
            return;
        }
        setMsg({ text: "2FA disabled", type: "success" });
        await refresh();
    };

    const regenerateBackupCodes = async () => {
        setRegenBusy(true);
        try {
            const res = await fetch("/api/auth/mfa/backup-codes/regenerate", {
                method: "POST",
                credentials: "include",
            });
            const data: any = await res.json();
            if (!res.ok) {
                setMsg({
                    text: data.error || "Regenerate failed",
                    type: "error",
                });
                return;
            }
            setRevealedCodes(data.backup_codes);
            setRegenDialog(false);
            await refresh();
        } finally {
            setRegenBusy(false);
        }
    };

    const revokeDevice = async (id: string) => {
        if (
            !confirm(
                "Revoke this device? It will be asked for 2FA on next login.",
            )
        )
            return;
        const res = await fetch(`/api/auth/devices/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!res.ok) {
            setMsg({ text: "Revoke failed", type: "error" });
            return;
        }
        await refresh();
    };

    // Build a plain-text dump of the codes with a short header so the
    // user opening the file later still knows what these are. ISO date
    // in the filename lets them stay sortable next to older batches.
    const downloadBackupCodes = (codes: string[]) => {
        const stamp = new Date().toISOString().slice(0, 10);
        const body = [
            "Elixpo Accounts — 2FA backup codes",
            `Generated: ${new Date().toUTCString()}`,
            "",
            "Each code can be used ONCE to sign in if you lose access to",
            "your authenticator. Keep this file somewhere safe (password",
            "manager, encrypted drive). Regenerate from accounts.elixpo.com",
            "→ Security if you suspect these have leaked.",
            "",
            ...codes,
            "",
        ].join("\n");
        const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `elixpo-backup-codes-${stamp}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const copyBackupCodes = async (codes: string[]) => {
        try {
            await navigator.clipboard.writeText(codes.join("\n"));
            setMsg({
                text: "Backup codes copied to clipboard",
                type: "success",
            });
        } catch {
            setMsg({
                text: "Couldn't copy — use Download instead",
                type: "error",
            });
        }
    };

    const revokeSession = async (s: Session) => {
        const isCurrent = s.is_current;
        const ok = confirm(
            isCurrent
                ? "Sign out from this device? You'll be returned to the login page."
                : `Sign out the session on ${s.device}? That device will be signed out next time it tries to refresh.`,
        );
        if (!ok) return;
        const res = await fetch(`/api/auth/sessions/${s.id}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!res.ok) {
            setMsg({ text: "Sign out failed", type: "error" });
            return;
        }
        if (isCurrent) {
            // Revoking the current session — clear cookies + bounce.
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            }).catch(() => {});
            window.location.href = "/login";
            return;
        }
        await refresh();
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: "#9b7bf7" }} />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 700,
                        color: "#f5f5f4",
                        mb: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                    }}
                >
                    <SecurityIcon sx={{ color: "#9b7bf7" }} /> Security
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
                    Two-factor authentication and trusted devices.
                </Typography>
            </Box>

            {status?.mfa_required && (
                <Alert
                    severity="warning"
                    sx={{
                        mb: 3,
                        bgcolor: "rgba(251,146,60,0.1)",
                        color: "#fed7aa",
                        border: "1px solid rgba(251,146,60,0.3)",
                    }}
                >
                    You own {status.owned_apps_count} OAuth apps. 2FA is
                    required to keep using the platform. Enroll a method below
                    and click Enable 2FA.
                </Alert>
            )}

            {msg && (
                <Alert
                    severity={msg.type}
                    onClose={() => setMsg(null)}
                    sx={{ mb: 3 }}
                >
                    {msg.text}
                </Alert>
            )}

            {/* Factors */}
            <Box sx={{ ...cardSx, mb: 3 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2,
                    }}
                >
                    <Typography
                        sx={{
                            color: "#f5f5f4",
                            fontWeight: 600,
                            fontSize: "1.1rem",
                        }}
                    >
                        Two-factor methods
                    </Typography>
                    <Chip
                        label={
                            status?.mfa_enabled ? "2FA enabled" : "2FA disabled"
                        }
                        size="small"
                        sx={{
                            bgcolor: status?.mfa_enabled
                                ? "rgba(134,239,172,0.1)"
                                : "rgba(255,255,255,0.05)",
                            color: status?.mfa_enabled
                                ? "#86efac"
                                : "rgba(255,255,255,0.5)",
                            border: `1px solid ${status?.mfa_enabled ? "rgba(134,239,172,0.3)" : "rgba(255,255,255,0.1)"}`,
                            fontWeight: 600,
                        }}
                    />
                </Box>

                {(status?.factors || []).length === 0 ? (
                    <Typography sx={{ color: "rgba(255,255,255,0.4)", py: 2 }}>
                        No methods enrolled yet. Pick one below to get started.
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                            mb: 2,
                        }}
                    >
                        {(status?.factors || []).map((f) => (
                            <Box
                                key={f.id}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: "10px",
                                    bgcolor: "rgba(255,255,255,0.025)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    opacity: f.confirmed ? 1 : 0.5,
                                }}
                            >
                                {kindIcon[f.kind]}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        sx={{
                                            color: "#f5f5f4",
                                            fontWeight: 600,
                                            fontSize: "0.9rem",
                                        }}
                                    >
                                        {f.name || kindLabel[f.kind]}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: "rgba(255,255,255,0.45)",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        {kindLabel[f.kind]} · added{" "}
                                        {new Date(
                                            f.created_at,
                                        ).toLocaleDateString()}
                                        {f.last_used_at
                                            ? ` · last used ${new Date(f.last_used_at).toLocaleDateString()}`
                                            : ""}
                                        {!f.confirmed
                                            ? " · pending confirmation"
                                            : ""}
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={() => removeFactor(f.id)}
                                    sx={{ color: "#ef4444" }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                )}

                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    <Button
                        variant="outlined"
                        startIcon={<PhoneAndroidIcon />}
                        onClick={startTotp}
                        sx={{
                            color: "#c8b6ff",
                            borderColor: "rgba(155,123,247,0.4)",
                            textTransform: "none",
                            "&:hover": {
                                borderColor: "#9b7bf7",
                                bgcolor: "rgba(155,123,247,0.06)",
                            },
                        }}
                    >
                        Add authenticator app
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<KeyIcon />}
                        onClick={enrollPasskey}
                        sx={{
                            color: "#c8b6ff",
                            borderColor: "rgba(155,123,247,0.4)",
                            textTransform: "none",
                            "&:hover": {
                                borderColor: "#9b7bf7",
                                bgcolor: "rgba(155,123,247,0.06)",
                            },
                        }}
                    >
                        Add passkey
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<MailOutlineIcon />}
                        onClick={enrollEmailOtp}
                        sx={{
                            color: "#c8b6ff",
                            borderColor: "rgba(155,123,247,0.4)",
                            textTransform: "none",
                            "&:hover": {
                                borderColor: "#9b7bf7",
                                bgcolor: "rgba(155,123,247,0.06)",
                            },
                        }}
                    >
                        Enable email code
                    </Button>
                </Box>

                <Box
                    sx={{
                        mt: 3,
                        pt: 3,
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        gap: 1.5,
                    }}
                >
                    {!status?.mfa_enabled ? (
                        <Button
                            variant="contained"
                            onClick={enableMfa}
                            disabled={
                                (status?.factors || []).filter(
                                    (f) => f.confirmed,
                                ).length === 0
                            }
                            sx={{
                                background:
                                    "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                textTransform: "none",
                                fontWeight: 600,
                            }}
                        >
                            Enable 2FA
                        </Button>
                    ) : (
                        <Button
                            variant="outlined"
                            onClick={disableMfa}
                            sx={{
                                color: "rgba(255,255,255,0.7)",
                                borderColor: "rgba(255,255,255,0.15)",
                                textTransform: "none",
                            }}
                        >
                            Disable 2FA
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Backup codes */}
            {status?.mfa_enabled && (
                <Box sx={{ ...cardSx, mb: 3 }}>
                    <Typography
                        sx={{
                            color: "#f5f5f4",
                            fontWeight: 600,
                            fontSize: "1.1rem",
                            mb: 0.5,
                        }}
                    >
                        Backup codes
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.85rem",
                            mb: 2,
                        }}
                    >
                        Single-use codes for when you lose access to your other
                        methods. You have{" "}
                        <strong style={{ color: "#f5f5f4" }}>
                            {status.unused_backup_codes}
                        </strong>{" "}
                        unused.
                    </Typography>

                    {revealedCodes && (
                        <Box
                            sx={{
                                p: 2,
                                mb: 2,
                                borderRadius: "10px",
                                background:
                                    "linear-gradient(135deg, rgba(155,123,247,0.12), rgba(95,182,255,0.05))",
                                border: "1px solid rgba(155,123,247,0.35)",
                            }}
                        >
                            <Typography
                                sx={{
                                    color: "#fde7a4",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    mb: 1.5,
                                }}
                            >
                                COPY THESE CODES NOW — THEY WILL NOT BE SHOWN
                                AGAIN
                            </Typography>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 1,
                                }}
                            >
                                {revealedCodes.map((c) => (
                                    <Box
                                        key={c}
                                        component="code"
                                        sx={{
                                            fontFamily:
                                                "var(--font-geist-mono), monospace",
                                            color: "#e8e8ed",
                                            bgcolor: "rgba(0,0,0,0.25)",
                                            p: 1,
                                            borderRadius: "6px",
                                            fontSize: "0.9rem",
                                            textAlign: "center",
                                        }}
                                    >
                                        {c}
                                    </Box>
                                ))}
                            </Box>
                            <Box
                                sx={{
                                    mt: 1.5,
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                }}
                            >
                                <Button
                                    size="small"
                                    startIcon={<DownloadIcon />}
                                    onClick={() =>
                                        downloadBackupCodes(revealedCodes)
                                    }
                                    sx={{
                                        color: "#c8b6ff",
                                        textTransform: "none",
                                        bgcolor: "rgba(155,123,247,0.1)",
                                        border: "1px solid rgba(155,123,247,0.3)",
                                        "&:hover": {
                                            bgcolor: "rgba(155,123,247,0.18)",
                                        },
                                    }}
                                >
                                    Download .txt
                                </Button>
                                <Button
                                    size="small"
                                    startIcon={<ContentCopyIcon />}
                                    onClick={() =>
                                        copyBackupCodes(revealedCodes)
                                    }
                                    sx={{
                                        color: "rgba(255,255,255,0.7)",
                                        textTransform: "none",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                        "&:hover": {
                                            bgcolor: "rgba(255,255,255,0.05)",
                                        },
                                    }}
                                >
                                    Copy
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => setRevealedCodes(null)}
                                    sx={{
                                        color: "rgba(255,255,255,0.4)",
                                        textTransform: "none",
                                        ml: "auto",
                                    }}
                                >
                                    I've saved them
                                </Button>
                            </Box>
                        </Box>
                    )}

                    <Button
                        variant="outlined"
                        onClick={() => setRegenDialog(true)}
                        sx={{
                            color: "#c8b6ff",
                            borderColor: "rgba(155,123,247,0.4)",
                            textTransform: "none",
                        }}
                    >
                        Regenerate backup codes
                    </Button>
                </Box>
            )}

            {/* Active sessions — every device currently signed in. */}
            <Box sx={{ ...cardSx, mb: 3 }}>
                <Typography
                    sx={{
                        color: "#f5f5f4",
                        fontWeight: 600,
                        fontSize: "1.1rem",
                        mb: 0.5,
                    }}
                >
                    Active sessions
                </Typography>
                <Typography
                    sx={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.85rem",
                        mb: 2,
                    }}
                >
                    Devices currently signed in to your account. Sign out any
                    you don't recognize.
                </Typography>
                {sessions.length === 0 ? (
                    <Typography sx={{ color: "rgba(255,255,255,0.4)", py: 2 }}>
                        No active sessions.
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        {sessions.map((s) => (
                            <Box
                                key={s.id}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: "10px",
                                    bgcolor: s.is_current
                                        ? "rgba(155,123,247,0.06)"
                                        : "rgba(255,255,255,0.025)",
                                    border: `1px solid ${s.is_current ? "rgba(155,123,247,0.3)" : "rgba(255,255,255,0.06)"}`,
                                }}
                            >
                                <LaptopIcon sx={{ color: "#9b7bf7" }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                color: "#f5f5f4",
                                                fontSize: "0.9rem",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {s.device}
                                        </Typography>
                                        {s.is_current && (
                                            <Chip
                                                label="This device"
                                                size="small"
                                                sx={{
                                                    height: 18,
                                                    fontSize: "0.65rem",
                                                    bgcolor:
                                                        "rgba(134,239,172,0.1)",
                                                    color: "#86efac",
                                                    border: "1px solid rgba(134,239,172,0.3)",
                                                    fontWeight: 600,
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Typography
                                        sx={{
                                            color: "rgba(255,255,255,0.45)",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        Signed in{" "}
                                        {new Date(
                                            s.created_at,
                                        ).toLocaleDateString()}
                                        {" · last active "}
                                        {new Date(
                                            s.last_used_at,
                                        ).toLocaleString()}
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    onClick={() => revokeSession(s)}
                                    sx={{
                                        color: "rgba(255,255,255,0.5)",
                                        textTransform: "none",
                                        fontSize: "0.8rem",
                                        "&:hover": {
                                            color: "#f87171",
                                            bgcolor: "rgba(239,68,68,0.08)",
                                        },
                                    }}
                                >
                                    Sign out
                                </Button>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Trusted devices */}
            <Box sx={cardSx}>
                <Typography
                    sx={{
                        color: "#f5f5f4",
                        fontWeight: 600,
                        fontSize: "1.1rem",
                        mb: 0.5,
                    }}
                >
                    Trusted devices
                </Typography>
                <Typography
                    sx={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.85rem",
                        mb: 2,
                    }}
                >
                    Devices that skip the 2FA prompt for 30 days. Revoke any you
                    don't recognize.
                </Typography>
                {devices.length === 0 ? (
                    <Typography sx={{ color: "rgba(255,255,255,0.4)", py: 2 }}>
                        No trusted devices.
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        {devices.map((d) => (
                            <Box
                                key={d.id}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: "10px",
                                    bgcolor: "rgba(255,255,255,0.025)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    opacity: d.is_active ? 1 : 0.4,
                                }}
                            >
                                <LaptopIcon
                                    sx={{
                                        color: d.is_active
                                            ? "#9b7bf7"
                                            : "rgba(255,255,255,0.3)",
                                    }}
                                />
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        sx={{
                                            color: "#f5f5f4",
                                            fontSize: "0.9rem",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {d.name ||
                                            d.ua_short ||
                                            "Unknown device"}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: "rgba(255,255,255,0.45)",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        {d.is_active
                                            ? `Last seen ${new Date(d.last_seen_at).toLocaleString()}`
                                            : "Revoked"}
                                    </Typography>
                                </Box>
                                {d.is_active && (
                                    <IconButton
                                        size="small"
                                        onClick={() => revokeDevice(d.id)}
                                        sx={{ color: "#ef4444" }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* TOTP enrollment dialog */}
            <Dialog
                open={totpDialog}
                onClose={() => setTotpDialog(false)}
                PaperProps={{
                    sx: {
                        bgcolor: "rgba(22,28,24,0.97)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px",
                        backdropFilter: "blur(20px)",
                    },
                }}
            >
                <DialogTitle sx={{ color: "#f5f5f4", fontWeight: 700 }}>
                    Set up authenticator app
                </DialogTitle>
                <DialogContent>
                    {totpData && (
                        <>
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    mb: 2,
                                    fontSize: "0.9rem",
                                }}
                            >
                                1. Open your authenticator app (Google
                                Authenticator, 1Password, Authy…) and scan this
                                QR code.
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    mb: 2,
                                }}
                            >
                                <Box
                                    component="img"
                                    src={totpData.qr_dataurl}
                                    alt="TOTP QR"
                                    sx={{
                                        width: 200,
                                        height: 200,
                                        borderRadius: "8px",
                                    }}
                                />
                            </Box>
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: "0.75rem",
                                    textAlign: "center",
                                    mb: 2,
                                }}
                            >
                                Or paste this secret:
                            </Typography>
                            <Box
                                component="code"
                                sx={{
                                    display: "block",
                                    fontFamily:
                                        "var(--font-geist-mono), monospace",
                                    bgcolor: "rgba(0,0,0,0.25)",
                                    color: "#c8b6ff",
                                    p: 1,
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    textAlign: "center",
                                    mb: 3,
                                    wordBreak: "break-all",
                                }}
                            >
                                {totpData.secret}
                            </Box>
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    mb: 1,
                                    fontSize: "0.9rem",
                                }}
                            >
                                2. Enter the 6-digit code your app shows:
                            </Typography>
                            <TextField
                                fullWidth
                                value={totpCode}
                                onChange={(e) =>
                                    setTotpCode(
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6),
                                    )
                                }
                                placeholder="123456"
                                inputProps={{
                                    inputMode: "numeric",
                                    style: {
                                        textAlign: "center",
                                        fontSize: "1.5rem",
                                        letterSpacing: "8px",
                                        fontFamily: "monospace",
                                    },
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        color: "#f5f5f4",
                                        "& fieldset": {
                                            borderColor:
                                                "rgba(255,255,255,0.15)",
                                        },
                                        "&:hover fieldset": {
                                            borderColor:
                                                "rgba(155,123,247,0.4)",
                                        },
                                        "&.Mui-focused fieldset": {
                                            borderColor: "#9b7bf7",
                                        },
                                    },
                                }}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions
                    sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", p: 2 }}
                >
                    <Button
                        onClick={() => setTotpDialog(false)}
                        sx={{ color: "rgba(255,255,255,0.6)" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmTotp}
                        variant="contained"
                        disabled={totpBusy || totpCode.length !== 6}
                        sx={{
                            background:
                                "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                            textTransform: "none",
                            fontWeight: 600,
                        }}
                    >
                        {totpBusy ? "Verifying…" : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Regenerate backup codes confirmation */}
            <Dialog
                open={regenDialog}
                onClose={() => !regenBusy && setRegenDialog(false)}
                PaperProps={{
                    sx: {
                        bgcolor: "rgba(22,28,24,0.97)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px",
                        backdropFilter: "blur(20px)",
                        maxWidth: 440,
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        color: "#f5f5f4",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                    }}
                >
                    <SecurityIcon sx={{ color: "#fbbf24" }} />
                    Regenerate backup codes?
                </DialogTitle>
                <DialogContent>
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "0.95rem",
                            mb: 2,
                        }}
                    >
                        A fresh set of 8 codes will be generated. You'll see
                        them once — make sure you save them.
                    </Typography>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: "8px",
                            bgcolor: "rgba(251,146,60,0.08)",
                            border: "1px solid rgba(251,146,60,0.25)",
                            color: "#fed7aa",
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                        }}
                    >
                        <Box>
                            <strong>
                                Your current codes will stop working
                                immediately.
                            </strong>
                            {status?.unused_backup_codes ? (
                                <>
                                    {" "}
                                    You have{" "}
                                    <strong>
                                        {status.unused_backup_codes}
                                    </strong>{" "}
                                    unused — these will be invalidated.
                                </>
                            ) : null}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions
                    sx={{
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                        p: 2,
                    }}
                >
                    <Button
                        onClick={() => setRegenDialog(false)}
                        disabled={regenBusy}
                        sx={{
                            color: "rgba(255,255,255,0.6)",
                            textTransform: "none",
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={regenerateBackupCodes}
                        disabled={regenBusy}
                        variant="contained"
                        sx={{
                            background:
                                "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                            textTransform: "none",
                            fontWeight: 600,
                        }}
                    >
                        {regenBusy ? "Generating…" : "Regenerate"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
