"use client";

import {
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography,
} from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const textFieldSx = {
    "& .MuiOutlinedInput-root": {
        color: "#f5f5f4",
        background: "transparent",
        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
        "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
        "&.Mui-focused fieldset": { borderColor: "#a3e635" },
        "& input:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
            WebkitTextFillColor: "#f5f5f4 !important",
            WebkitTransition: "background-color 5000s ease-in-out 0s",
        },
        "& input:-webkit-autofill:hover": {
            WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
            WebkitTextFillColor: "#f5f5f4 !important",
        },
        "& input:-webkit-autofill:focus": {
            WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
            WebkitTextFillColor: "#f5f5f4 !important",
        },
    },
    "& .MuiInputBase-input::placeholder": { color: "transparent", opacity: 0 },
    "& .MuiInputLabel-root": { color: "rgba(255, 255, 255, 0.7)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#a3e635" },
};

const btnSx = {
    my: 2,
    background: "rgba(163, 230, 53, 0.15)",
    color: "#a3e635",
    border: "1px solid rgba(163, 230, 53, 0.3)",
    fontWeight: 600,
    py: 1.2,
    textTransform: "none",
    fontSize: "1rem",
    "&:hover": {
        background: "rgba(163, 230, 53, 0.25)",
        borderColor: "rgba(163, 230, 53, 0.5)",
    },
    "&:disabled": {
        color: "rgba(255, 255, 255, 0.4)",
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
};

type Stage = "email" | "otp" | "reset" | "done";

function ForgotPasswordContent() {
    const searchParams = useSearchParams();
    const tokenParam = searchParams.get("token");

    const [stage, setStage] = useState<Stage>(tokenParam ? "otp" : "email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resendTimer, setResendTimer] = useState(0);
    const [tokenLoading, setTokenLoading] = useState(!!tokenParam);

    // If opened from email button with ?token=..., auto-resolve the OTP
    useEffect(() => {
        if (!tokenParam) return;

        (async () => {
            try {
                const res = await fetch("/api/auth/reset-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: tokenParam }),
                });
                const data: any = await res.json();

                if (res.ok && data.code && data.email) {
                    setOtp(data.code);
                    setEmail(data.email);
                    setStage("reset");
                } else {
                    setError(data.error || "Invalid or expired link.");
                    setStage("email");
                }
            } catch {
                setError(
                    "Failed to process the link. Please enter your email manually.",
                );
                setStage("email");
            } finally {
                setTokenLoading(false);
            }
        })();
    }, [tokenParam]);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !email.includes("@")) {
            setError("Please enter a valid email address");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data: any = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to send reset code");
            } else {
                setStage("otp");
                setResendTimer(60);
            }
        } catch {
            setError("Network error, please try again");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!otp || otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }

        // OTP is verified server-side during password reset, just move to next stage
        setStage("reset");
    };

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: otp, newPassword }),
            });
            const data: any = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to reset password");
            } else {
                setStage("done");
            }
        } catch {
            setError("Network error, please try again");
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data: any = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to resend code");
            } else {
                setResendTimer(60);
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [resendTimer]);

    if (tokenLoading) {
        return (
            <Box
                sx={{
                    minHeight: "90vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                        "linear-gradient(135deg, #141a16 0%, #1c2420 50%, #141a16 100%)",
                }}
            >
                <CircularProgress sx={{ color: "#a3e635" }} />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: "90vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "linear-gradient(135deg, #141a16 0%, #1c2420 50%, #141a16 100%)",
                p: 2,
            }}
        >
            <Box
                sx={{
                    maxWidth: "420px",
                    width: "100%",
                    backdropFilter: "blur(20px)",
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "16px",
                    p: 3,
                }}
            >
                <Box sx={{ mb: 3, textAlign: "center" }}>
                    <Typography
                        variant="h4"
                        sx={{ fontWeight: 700, color: "#f5f5f4", mb: 0.5 }}
                    >
                        Reset Password
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "0.95rem",
                        }}
                    >
                        {stage === "email" && "Enter your email address"}
                        {stage === "otp" && "Enter the OTP sent to your email"}
                        {stage === "reset" && "Create a new password"}
                        {stage === "done" && "Password reset successful"}
                    </Typography>
                </Box>

                {error && (
                    <Box
                        sx={{
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#f87171",
                            p: 1.5,
                            borderRadius: "8px",
                            mb: 2,
                            fontSize: "0.85rem",
                        }}
                    >
                        {error}
                    </Box>
                )}

                {/* Email Stage */}
                {stage === "email" && (
                    <form onSubmit={handleEmailSubmit}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="dense"
                            sx={textFieldSx}
                            required
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            type="submit"
                            disabled={loading}
                            sx={btnSx}
                        >
                            {loading ? "Sending OTP..." : "Send OTP"}
                        </Button>
                    </form>
                )}

                {/* OTP Stage */}
                {stage === "otp" && (
                    <form onSubmit={handleOtpSubmit}>
                        <TextField
                            fullWidth
                            label="6-Digit OTP"
                            type="text"
                            value={otp}
                            onChange={(e) =>
                                setOtp(
                                    e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 6),
                                )
                            }
                            margin="dense"
                            sx={textFieldSx}
                            placeholder="000000"
                            inputProps={{ maxLength: 6 }}
                            required
                        />
                        <Typography
                            sx={{
                                color: "rgba(255, 255, 255, 0.5)",
                                fontSize: "0.85rem",
                                mt: 1,
                                mb: 2,
                            }}
                        >
                            OTP sent to {email}
                        </Typography>
                        <Button
                            fullWidth
                            variant="contained"
                            type="submit"
                            disabled={loading}
                            sx={btnSx}
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
                        </Button>
                        <Box sx={{ textAlign: "center" }}>
                            <Button
                                disabled={resendTimer > 0 || loading}
                                onClick={handleResendOtp}
                                sx={{
                                    textTransform: "none",
                                    color: "#a3e635",
                                    "&:hover": { background: "transparent" },
                                    "&:disabled": {
                                        color: "rgba(255, 255, 255, 0.3)",
                                    },
                                }}
                            >
                                {resendTimer > 0
                                    ? `Resend in ${resendTimer}s`
                                    : "Resend OTP"}
                            </Button>
                        </Box>
                    </form>
                )}

                {/* Reset Password Stage */}
                {stage === "reset" && (
                    <form onSubmit={handleResetSubmit}>
                        <TextField
                            fullWidth
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            margin="dense"
                            sx={textFieldSx}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            margin="dense"
                            sx={textFieldSx}
                            required
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            type="submit"
                            disabled={loading}
                            sx={btnSx}
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </Button>
                    </form>
                )}

                {/* Success Stage */}
                {stage === "done" && (
                    <Box sx={{ textAlign: "center", py: 2 }}>
                        <Typography
                            sx={{
                                color: "#a3e635",
                                fontSize: "1.1rem",
                                fontWeight: 600,
                                mb: 2,
                            }}
                        >
                            Your password has been reset.
                        </Typography>
                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: "0.9rem",
                                mb: 3,
                            }}
                        >
                            You can now sign in with your new password.
                        </Typography>
                        <Button
                            href="/login"
                            fullWidth
                            variant="contained"
                            sx={btnSx}
                        >
                            Sign In
                        </Button>
                    </Box>
                )}

                {stage !== "done" && (
                    <Box
                        sx={{
                            mt: 2,
                            pt: 2,
                            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                            textAlign: "center",
                        }}
                    >
                        <Typography
                            sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 1 }}
                        >
                            Back to login?
                        </Typography>
                        <Link
                            href="/login"
                            style={{
                                color: "#a3e635",
                                textDecoration: "none",
                                fontWeight: 600,
                            }}
                        >
                            Sign in
                        </Link>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense
            fallback={
                <Box
                    sx={{
                        minHeight: "90vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                            "linear-gradient(135deg, #141a16 0%, #1c2420 50%, #141a16 100%)",
                    }}
                >
                    <CircularProgress sx={{ color: "#a3e635" }} />
                </Box>
            }
        >
            <ForgotPasswordContent />
        </Suspense>
    );
}
