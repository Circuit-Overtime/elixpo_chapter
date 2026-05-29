"use client";

import {
    Alert,
    Box,
    Button,
    Snackbar,
    TextField,
    Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const ACCENT = "#9b7bf7";

const textFieldSx = {
    "& .MuiOutlinedInput-root": {
        color: "#f4f4f6",
        background: "transparent",
        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.12)" },
        "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.24)" },
        "&.Mui-focused fieldset": { borderColor: ACCENT },
    },
    "& .MuiInputLabel-root": { color: "rgba(255, 255, 255, 0.7)" },
    "& .MuiInputLabel-root.Mui-focused": { color: ACCENT },
    "& .MuiFormHelperText-root": { color: "rgba(255, 255, 255, 0.4)" },
};

function slugifyHandle(s: string): string {
    return (s || "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-_]+|[-_]+$/g, "")
        .slice(0, 32);
}

const SetupNameContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [check, setCheck] = useState<{
        state: "idle" | "checking" | "available" | "taken";
        reason?: string;
    }>({ state: "idle" });
    const [toast, setToast] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({ open: false, message: "", severity: "success" });

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/auth/me", {
                    credentials: "include",
                });
                if (!res.ok) {
                    window.location.href = next
                        ? `/login?next=${encodeURIComponent(next)}`
                        : "/login";
                    return;
                }
                const data: any = await res.json();
                // Already has a handle → setup complete, move on.
                if (data.username) {
                    window.location.href = next || "/dashboard/oauth-apps";
                    return;
                }
                const dn = data.displayName || "";
                setDisplayName(dn);
                setUsername(slugifyHandle(dn));
            } catch {
                router.push("/login");
            } finally {
                setPageLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounced availability check.
    useEffect(() => {
        const u = username.trim().toLowerCase();
        if (!u) {
            setCheck({ state: "idle" });
            return;
        }
        setCheck({ state: "checking" });
        const t = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/api/auth/username/check?u=${encodeURIComponent(u)}`,
                );
                const data: any = await res.json();
                setCheck(
                    data.available
                        ? { state: "available" }
                        : { state: "taken", reason: data.reason },
                );
            } catch {
                setCheck({ state: "idle" });
            }
        }, 350);
        return () => clearTimeout(t);
    }, [username]);

    const handleSave = async () => {
        const dn = displayName.trim();
        const handle = username.trim().toLowerCase();
        if (dn.length < 2 || dn.length > 32) {
            setToast({ open: true, message: "Display name must be 2-32 characters.", severity: "error" });
            return;
        }
        if (check.state !== "available") {
            setToast({ open: true, message: check.reason || "Pick an available username.", severity: "error" });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ username: handle, display_name: dn }),
            });
            if (!res.ok) {
                const data: any = await res.json();
                throw new Error(data.error || "Failed to save");
            }
            setToast({ open: true, message: "All set!", severity: "success" });
            const dest = next || "/dashboard/oauth-apps";
            setTimeout(() => {
                window.location.href = dest;
            }, 800);
        } catch (err) {
            setToast({
                open: true,
                message: err instanceof Error ? err.message : "Failed to save",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                        "linear-gradient(135deg, #0f1117 0%, #131922 50%, #0f1117 100%)",
                }}
            >
                <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>
                    Loading...
                </Typography>
            </Box>
        );
    }

    const handleHelper =
        check.state === "checking"
            ? "Checking availability…"
            : check.state === "available"
              ? "✓ Available"
              : check.state === "taken"
                ? `✗ ${check.reason || "Taken"}`
                : "3–32 chars. Lowercase letters, numbers, - and _. This is your @handle.";
    const handleHelperColor =
        check.state === "available"
            ? "#4ade80"
            : check.state === "taken"
              ? "#f87171"
              : "rgba(255,255,255,0.4)";

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "linear-gradient(135deg, #0f1117 0%, #131922 50%, #0f1117 100%)",
                p: 2,
            }}
        >
            <Box
                sx={{
                    maxWidth: "460px",
                    width: "100%",
                    backdropFilter: "blur(20px)",
                    background: "#1a1d29",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "16px",
                    p: 4,
                }}
            >
                <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Typography
                        variant="h4"
                        sx={{ fontWeight: 700, color: "#f4f4f6", mb: 1 }}
                    >
                        Claim your handle
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "0.95rem",
                        }}
                    >
                        Pick a unique username and a display name. Your username
                        is how you&apos;re linked across Elixpo services.
                    </Typography>
                </Box>

                <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    onChange={(e) =>
                        setUsername(
                            e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                        )
                    }
                    placeholder="e.g. anwesha, swift-fox"
                    helperText={handleHelper}
                    FormHelperTextProps={{ sx: { color: `${handleHelperColor} !important` } }}
                    sx={{ ...textFieldSx, mb: 2.5 }}
                    disabled={loading}
                    inputProps={{ maxLength: 32 }}
                    InputProps={{
                        startAdornment: (
                            <Typography sx={{ color: "rgba(255,255,255,0.4)", mr: 0.5 }}>@</Typography>
                        ),
                    }}
                />

                <TextField
                    fullWidth
                    label="Display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Anwesha Chakraborty"
                    helperText="2-32 characters. Shown on your profile."
                    sx={textFieldSx}
                    disabled={loading}
                    inputProps={{ maxLength: 32 }}
                />

                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSave}
                    disabled={
                        loading ||
                        check.state !== "available" ||
                        displayName.trim().length < 2
                    }
                    sx={{
                        mt: 3,
                        background: ACCENT,
                        color: "#fff",
                        fontWeight: 600,
                        textTransform: "none",
                        fontSize: "0.95rem",
                        py: 1.3,
                        "&:hover": { background: "#b69aff" },
                        "&:disabled": {
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255, 255, 255, 0.3)",
                        },
                    }}
                >
                    {loading ? "Saving..." : "Continue"}
                </Button>

                <Typography
                    sx={{
                        color: "rgba(255, 255, 255, 0.3)",
                        fontSize: "0.8rem",
                        textAlign: "center",
                        mt: 2.5,
                    }}
                >
                    Your username can be changed later from your profile, but
                    links to your old handle will break.
                </Typography>
            </Box>

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast({ ...toast, open: false })}
                    severity={toast.severity}
                    variant="filled"
                    sx={{
                        ...(toast.severity === "success" && {
                            backgroundColor: "#15803d",
                            color: "#fff",
                        }),
                        ...(toast.severity === "error" && {
                            backgroundColor: "#b91c1c",
                            color: "#fff",
                        }),
                    }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

const SetupNamePage = () => (
    <Suspense>
        <SetupNameContent />
    </Suspense>
);

export default SetupNamePage;
