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

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch("/api/auth/me", {
                    credentials: "include",
                });
                if (response.ok) {
                    const user: any = await response.json();
                    if (user.isAdmin) {
                        router.push("/admin");
                        return;
                    }
                }
            } catch {
                // not logged in
            } finally {
                setChecking(false);
            }
        };

        checkAuth();
    }, [router]);

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
                    bgcolor: "#161816",
                }}
            >
                <CircularProgress sx={{ color: "#22c55e" }} />
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
                bgcolor: "#161816",
                backgroundImage:
                    "radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)",
            }}
        >
            <Card
                sx={{
                    width: "100%",
                    maxWidth: 420,
                    bgcolor: "#1e2420",
                    border: "1px solid #333",
                    borderRadius: "16px",
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
                                    "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
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
                            variant="h4"
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
                                    "& fieldset": { borderColor: "#3a4a3e" },
                                    "&:hover fieldset": {
                                        borderColor: "#22c55e",
                                    },
                                    "&.Mui-focused fieldset": {
                                        borderColor: "#22c55e",
                                    },
                                },
                                "& .MuiInputLabel-root": {
                                    color: "#9ca3af",
                                    "&.Mui-focused": { color: "#22c55e" },
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
                                    "& fieldset": { borderColor: "#3a4a3e" },
                                    "&:hover fieldset": {
                                        borderColor: "#22c55e",
                                    },
                                    "&.Mui-focused fieldset": {
                                        borderColor: "#22c55e",
                                    },
                                },
                                "& .MuiInputLabel-root": {
                                    color: "#9ca3af",
                                    "&.Mui-focused": { color: "#22c55e" },
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
                                bgcolor: "#22c55e",
                                color: "#000",
                                fontWeight: 600,
                                py: 1.5,
                                "&:hover": { bgcolor: "#16a34a" },
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
