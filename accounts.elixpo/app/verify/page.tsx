"use client";

import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Status = "loading" | "success" | "error";

function VerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<Status>("loading");
    const [message, setMessage] = useState("Verifying your email...");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("No verification token found.");
            return;
        }

        (async () => {
            try {
                // 1. Look up the OTP code from the verification token
                const lookupRes = await fetch(
                    `/api/auth/verify-by-token?token=${encodeURIComponent(token)}`,
                );
                const lookupData: any = await lookupRes.json();

                if (!lookupRes.ok) {
                    if (lookupData.alreadyVerified) {
                        setStatus("success");
                        setMessage("Your email has already been verified.");
                    } else {
                        setStatus("error");
                        setMessage(
                            lookupData.error || "Invalid verification link.",
                        );
                    }
                    return;
                }

                // 2. Auto-submit the OTP code to verify the email
                const verifyRes = await fetch("/api/auth/verify-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ code: lookupData.code }),
                });
                const verifyData: any = await verifyRes.json();

                if (verifyRes.ok) {
                    setStatus("success");
                    setMessage("Your email has been verified successfully!");
                } else {
                    // If user isn't logged in, the verify-email endpoint returns 401
                    if (verifyRes.status === 401) {
                        setStatus("error");
                        setMessage(
                            "Please log in first, then click the verification link again.",
                        );
                    } else {
                        setStatus("error");
                        setMessage(verifyData.error || "Verification failed.");
                    }
                }
            } catch {
                setStatus("error");
                setMessage("Something went wrong. Please try again.");
            }
        })();
    }, [token]);

    return (
        <Box
            sx={{
                minHeight: "100vh",
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
                    maxWidth: 420,
                    width: "100%",
                    textAlign: "center",
                    backdropFilter: "blur(20px)",
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "16px",
                    p: 4,
                }}
            >
                {status === "loading" && (
                    <>
                        <CircularProgress sx={{ color: "#a3e635", mb: 2 }} />
                        <Typography
                            sx={{ color: "#f5f5f4", fontSize: "1.1rem" }}
                        >
                            {message}
                        </Typography>
                    </>
                )}

                {status === "success" && (
                    <>
                        <Box sx={{ fontSize: "3rem", mb: 1 }}>&#10003;</Box>
                        <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: "#a3e635", mb: 1 }}
                        >
                            Verified
                        </Typography>
                        <Typography
                            sx={{ color: "rgba(255,255,255,0.6)", mb: 3 }}
                        >
                            {message}
                        </Typography>
                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: "0.9rem",
                                mb: 2,
                            }}
                        >
                            You can close this tab and return to the original
                            page.
                        </Typography>
                        <Button
                            href="/dashboard/oauth-apps"
                            sx={{
                                color: "#a3e635",
                                border: "1px solid rgba(163, 230, 53, 0.3)",
                                textTransform: "none",
                                fontWeight: 600,
                                "&:hover": {
                                    background: "rgba(163, 230, 53, 0.1)",
                                },
                            }}
                        >
                            Go to Dashboard
                        </Button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <Box sx={{ fontSize: "3rem", mb: 1, color: "#ef4444" }}>
                            &#10007;
                        </Box>
                        <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: "#ef4444", mb: 1 }}
                        >
                            Verification Failed
                        </Typography>
                        <Typography
                            sx={{ color: "rgba(255,255,255,0.6)", mb: 3 }}
                        >
                            {message}
                        </Typography>
                        <Button
                            href="/login"
                            sx={{
                                color: "#a3e635",
                                border: "1px solid rgba(163, 230, 53, 0.3)",
                                textTransform: "none",
                                fontWeight: 600,
                                "&:hover": {
                                    background: "rgba(163, 230, 53, 0.1)",
                                },
                            }}
                        >
                            Go to Login
                        </Button>
                    </>
                )}
            </Box>
        </Box>
    );
}

export default function VerifyPage() {
    return (
        <Suspense
            fallback={
                <Box
                    sx={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "#141a16",
                    }}
                >
                    <CircularProgress sx={{ color: "#a3e635" }} />
                </Box>
            }
        >
            <VerifyContent />
        </Suspense>
    );
}
