"use client";

import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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
        color: "#a3e635",
        border: "1px solid rgba(163, 230, 53, 0.3)",
        textTransform: "none",
        fontWeight: 600,
        px: 4,
        py: 1.2,
        "&:hover": { background: "rgba(163, 230, 53, 0.1)" },
    };

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
                    maxWidth: 460,
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
                        <Typography sx={{ color: "#f5f5f4" }}>
                            Validating invitation...
                        </Typography>
                    </>
                )}

                {status === "ready" && (
                    <>
                        <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: "#f5f5f4", mb: 1 }}
                        >
                            Admin Invitation
                        </Typography>
                        <Typography
                            sx={{ color: "rgba(255,255,255,0.6)", mb: 1 }}
                        >
                            You have been invited to become an administrator on
                            Elixpo Accounts.
                        </Typography>
                        <Typography
                            sx={{
                                color: "#a3e635",
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
                        <CircularProgress sx={{ color: "#a3e635", mb: 2 }} />
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
                            sx={{ fontWeight: 700, color: "#a3e635", mb: 1 }}
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
                        <Box sx={{ fontSize: "3rem", mb: 1, color: "#ef4444" }}>
                            &#10007;
                        </Box>
                        <Typography
                            variant="h5"
                            sx={{ fontWeight: 700, color: "#ef4444", mb: 1 }}
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
                        bgcolor: "#141a16",
                    }}
                >
                    <CircularProgress sx={{ color: "#a3e635" }} />
                </Box>
            }
        >
            <AcceptInviteContent />
        </Suspense>
    );
}
