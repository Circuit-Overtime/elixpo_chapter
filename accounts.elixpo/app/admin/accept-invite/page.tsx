"use client";

import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BackgroundAurora from "../../components/background-aurora";

export const runtime = "edge";

type Status = "loading" | "ready" | "accepting" | "success" | "error";

function AcceptInviteContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<Status>("loading");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("No invitation token found.");
            return;
        }

        (async () => {
            try {
                const res = await fetch(
                    `/api/admin/invite?token=${encodeURIComponent(token)}`,
                );
                const data: any = await res.json();

                if (res.ok) {
                    setEmail(data.email);
                    setStatus("ready");
                } else {
                    setStatus("error");
                    setMessage(data.error || "Invalid invitation.");
                }
            } catch {
                setStatus("error");
                setMessage("Failed to validate invitation.");
            }
        })();
    }, [token]);

    const handleAccept = async () => {
        setStatus("accepting");
        try {
            const res = await fetch("/api/admin/invite", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ token }),
            });
            const data: any = await res.json();

            if (res.ok) {
                setStatus("success");
                setMessage(data.message || "You are now an admin!");
            } else {
                setStatus("error");
                setMessage(data.error || "Failed to accept invitation.");
            }
        } catch {
            setStatus("error");
            setMessage("Network error. Please try again.");
        }
    };

    const btnSx = {
        color: "#9b7bf7",
        border: "1px solid rgba(155, 123, 247, 0.3)",
        textTransform: "none",
        fontWeight: 600,
        px: 4,
        py: 1.2,
        "&:hover": { background: "rgba(155, 123, 247, 0.1)" },
    };

    return (
        <Box sx={{ position: "relative", minHeight: "100vh" }}>
            <BackgroundAurora variant="warm" />
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "transparent",
                    p: 2,
                }}
            >
                <Box
                    sx={{
                        maxWidth: 460,
                        width: "100%",
                        textAlign: "center",
                        backdropFilter: "blur(20px)",
                        background:
                            "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "16px",
                        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
                        p: 4,
                    }}
                >
                    {status === "loading" && (
                        <>
                            <CircularProgress
                                sx={{ color: "#9b7bf7", mb: 2 }}
                            />
                            <Typography sx={{ color: "#f5f5f4" }}>
                                Validating invitation...
                            </Typography>
                        </>
                    )}

                    {status === "ready" && (
                        <>
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 700,
                                    color: "#f5f5f4",
                                    mb: 1,
                                }}
                            >
                                Admin Invitation
                            </Typography>
                            <Typography
                                sx={{ color: "rgba(255,255,255,0.6)", mb: 1 }}
                            >
                                You have been invited to become an administrator
                                on Elixpo Accounts.
                            </Typography>
                            <Typography
                                sx={{
                                    color: "#9b7bf7",
                                    fontSize: "0.95rem",
                                    mb: 3,
                                }}
                            >
                                {email}
                            </Typography>
                            <Button onClick={handleAccept} sx={btnSx}>
                                Accept Invitation
                            </Button>
                        </>
                    )}

                    {status === "accepting" && (
                        <>
                            <CircularProgress
                                sx={{ color: "#9b7bf7", mb: 2 }}
                            />
                            <Typography sx={{ color: "#f5f5f4" }}>
                                Accepting invitation...
                            </Typography>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <Box sx={{ fontSize: "3rem", mb: 1 }}>&#10003;</Box>
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 700,
                                    color: "#9b7bf7",
                                    mb: 1,
                                }}
                            >
                                Welcome, Admin!
                            </Typography>
                            <Typography
                                sx={{ color: "rgba(255,255,255,0.6)", mb: 3 }}
                            >
                                {message}
                            </Typography>
                            <Button href="/admin" sx={btnSx}>
                                Go to Admin Panel
                            </Button>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <Box
                                sx={{
                                    fontSize: "3rem",
                                    mb: 1,
                                    color: "#ef4444",
                                }}
                            >
                                &#10007;
                            </Box>
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 700,
                                    color: "#ef4444",
                                    mb: 1,
                                }}
                            >
                                Invitation Error
                            </Typography>
                            <Typography
                                sx={{ color: "rgba(255,255,255,0.6)", mb: 3 }}
                            >
                                {message}
                            </Typography>
                            <Button href="/login" sx={btnSx}>
                                Go to Login
                            </Button>
                        </>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

export default function AcceptInvitePage() {
    return (
        <Suspense
            fallback={
                <Box
                    sx={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "transparent",
                    }}
                >
                    <CircularProgress sx={{ color: "#9b7bf7" }} />
                </Box>
            }
        >
            <AcceptInviteContent />
        </Suspense>
    );
}
