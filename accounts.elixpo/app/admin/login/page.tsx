"use client";

import { Lock } from "@mui/icons-material";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    TextField,
    Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

export default function AdminLogin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    // Auth check uses window.location so router isn't referenced inside the
    // effect (prevents eslint-react-hooks autofix from looping the effect).
    useEffect(() => {
        (async () => {
            try {
                const response = await fetch("/api/auth/me", {
                    credentials: "include",
                });
                if (response.ok) {
                    const user: any = await response.json();
                    if (user.isAdmin) {
                        window.location.assign("/admin");
                        return;
                    }
                }
            } catch {
                // not logged in
            } finally {
                setChecking(false);
            }
        })();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password, provider: "email" }),
            });

            const data: any = await response.json();

            if (!response.ok) {
                setError(data.error || "Login failed");
                return;
            }

            if (!data.user?.isAdmin) {
                setError(
                    "Admin access required. This account does not have admin privileges.",
                );
                return;
            }

            router.push("/admin");
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                    bgcolor: "transparent",
                }}
            >
                <CircularProgress sx={{ color: "#9b7bf7" }} />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                bgcolor: "transparent",
            }}
        >
            <Card
                sx={{
                    width: "100%",
                    maxWidth: 420,
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "16px",
                    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ mb: 3, textAlign: "center" }}>
                        <Box
                            sx={{
                                width: 60,
                                height: 60,
                                borderRadius: "12px",
                                background:
                                    "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                mx: "auto",
                                mb: 2,
                            }}
                        >
                            <Lock sx={{ color: "#fff", fontSize: "1.8rem" }} />
                        </Box>
                        <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: "#fff", mb: 1 }}
                        >
                            Admin Panel
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                            Secure access for authorized administrators only
                        </Typography>
                    </Box>

                    {error && (
                        <Alert
                            severity="error"
                            sx={{
                                mb: 2,
                                bgcolor: "rgba(239, 68, 68, 0.1)",
                                color: "#ef4444",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                "& .MuiAlert-icon": { color: "#ef4444" },
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleLogin}>
                        <TextField
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            variant="outlined"
                            margin="normal"
                            disabled={loading}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    color: "#e5e7eb",
                                    "& fieldset": {
                                        borderColor:
                                            "rgba(255, 255, 255, 0.12)",
                                    },
                                    "&:hover fieldset": {
                                        borderColor: "#9b7bf7",
                                    },
                                    "&.Mui-focused fieldset": {
                                        borderColor: "#9b7bf7",
                                    },
                                },
                                "& .MuiInputLabel-root": {
                                    color: "#9ca3af",
                                    "&.Mui-focused": { color: "#9b7bf7" },
                                },
                            }}
                        />
                        <TextField
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                            variant="outlined"
                            margin="normal"
                            disabled={loading}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    color: "#e5e7eb",
                                    "& fieldset": {
                                        borderColor:
                                            "rgba(255, 255, 255, 0.12)",
                                    },
                                    "&:hover fieldset": {
                                        borderColor: "#9b7bf7",
                                    },
                                    "&.Mui-focused fieldset": {
                                        borderColor: "#9b7bf7",
                                    },
                                },
                                "& .MuiInputLabel-root": {
                                    color: "#9ca3af",
                                    "&.Mui-focused": { color: "#9b7bf7" },
                                },
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading || !email || !password}
                            sx={{
                                mt: 3,
                                bgcolor: "#9b7bf7",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                py: 1.5,
                                "&:hover": { bgcolor: "#7c5cff" },
                                "&:disabled": { opacity: 0.6 },
                            }}
                        >
                            {loading ? "Logging in..." : "Login to Admin Panel"}
                        </Button>
                    </form>

                    <Typography
                        variant="caption"
                        sx={{
                            display: "block",
                            textAlign: "center",
                            mt: 3,
                            color: "#6b7280",
                        }}
                    >
                        Only users with admin privileges can access this panel
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}
