"use client";

import LinkOffIcon from "@mui/icons-material/LinkOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Button, Chip, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { generatePixelAvatar } from "@/lib/pixel-avatar";

interface ConnectedService {
    client_id: string;
    name: string;
    description?: string;
    homepage_url?: string;
    logo_url?: string;
    first_authorized: string;
    last_authorized: string;
}

function ServiceIcon({
    svc,
    size = 40,
}: {
    svc: ConnectedService;
    size?: number;
}) {
    const [faviconFailed, setFaviconFailed] = useState(false);
    const hostname = svc.homepage_url
        ? (() => {
              try {
                  return new URL(svc.homepage_url).hostname;
              } catch {
                  return "";
              }
          })()
        : "";

    if (svc.homepage_url && hostname && !faviconFailed) {
        return (
            <Box
                component="img"
                src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                alt=""
                sx={{
                    width: size,
                    height: size,
                    borderRadius: "10px",
                    flexShrink: 0,
                    bgcolor: "rgba(255,255,255,0.05)",
                    p: 0.5,
                }}
                onError={() => setFaviconFailed(true)}
            />
        );
    }

    // Pixel avatar fallback
    return (
        <Box
            component="img"
            src={generatePixelAvatar(svc.client_id + svc.name, size)}
            alt=""
            sx={{
                width: size,
                height: size,
                borderRadius: "10px",
                flexShrink: 0,
            }}
        />
    );
}

const ServicesPage = () => {
    const [services, setServices] = useState<ConnectedService[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/auth/connected-services", {
                credentials: "include",
            });
            if (res.ok) {
                const data: any = await res.json();
                setServices(data.services || []);
            }
        } catch {
            // fail silently
        } finally {
            setLoading(false);
        }
    };

    const revokeService = async (clientId: string) => {
        if (
            !confirm(
                "Revoke access for this service? You will need to re-authorize it to use it again.",
            )
        )
            return;
        setRevoking(clientId);
        try {
            const res = await fetch(
                `/api/auth/connected-services?client_id=${clientId}`,
                {
                    method: "DELETE",
                    credentials: "include",
                },
            );
            if (res.ok) {
                setServices((prev) =>
                    prev.filter((s) => s.client_id !== clientId),
                );
            }
        } catch {
            // fail silently
        } finally {
            setRevoking(null);
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#f5f5f4", mb: 1 }}
                >
                    Connected Services
                </Typography>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    Applications you've signed in to using your Elixpo account.
                </Typography>
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress sx={{ color: "#a3e635" }} />
                </Box>
            ) : services.length === 0 ? (
                <Box
                    sx={{
                        py: 8,
                        textAlign: "center",
                        borderRadius: "16px",
                        bgcolor: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                    }}
                >
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.35)",
                            fontSize: "1rem",
                            mb: 0.5,
                        }}
                    >
                        No connected services yet
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.2)",
                            fontSize: "0.85rem",
                        }}
                    >
                        When you sign in to third-party apps using Elixpo,
                        they'll appear here.
                    </Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: 2,
                    }}
                >
                    {services.map((svc) => {
                        const hostname = svc.homepage_url
                            ? (() => {
                                  try {
                                      return new URL(svc.homepage_url).hostname;
                                  } catch {
                                      return "";
                                  }
                              })()
                            : "";
                        return (
                            <Box
                                key={svc.client_id}
                                sx={{
                                    p: 2.5,
                                    borderRadius: "14px",
                                    bgcolor: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.07)",
                                    transition: "border-color 0.2s",
                                    "&:hover": {
                                        borderColor: "rgba(255,255,255,0.15)",
                                    },
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                {/* Top row: icon + name + revoke */}
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                    }}
                                >
                                    <ServiceIcon svc={svc} size={44} />
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography
                                            sx={{
                                                color: "#f5f5f4",
                                                fontWeight: 600,
                                                fontSize: "1rem",
                                            }}
                                        >
                                            {svc.name}
                                        </Typography>
                                        {hostname && (
                                            <Typography
                                                component="a"
                                                href={svc.homepage_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    color: "rgba(255,255,255,0.3)",
                                                    fontSize: "0.75rem",
                                                    textDecoration: "none",
                                                    fontFamily: "monospace",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 0.5,
                                                    "&:hover": {
                                                        color: "#a3e635",
                                                    },
                                                }}
                                            >
                                                {hostname}
                                                <OpenInNewIcon
                                                    sx={{ fontSize: "0.7rem" }}
                                                />
                                            </Typography>
                                        )}
                                    </Box>
                                    <Button
                                        size="small"
                                        startIcon={<LinkOffIcon />}
                                        onClick={() =>
                                            revokeService(svc.client_id)
                                        }
                                        disabled={revoking === svc.client_id}
                                        sx={{
                                            color: "rgba(255,255,255,0.35)",
                                            textTransform: "none",
                                            fontSize: "0.8rem",
                                            flexShrink: 0,
                                            borderRadius: "8px",
                                            px: 1.5,
                                            "&:hover": {
                                                color: "#ef4444",
                                                bgcolor: "rgba(239,68,68,0.08)",
                                            },
                                        }}
                                    >
                                        {revoking === svc.client_id
                                            ? "..."
                                            : "Revoke"}
                                    </Button>
                                </Box>

                                {/* Description */}
                                {svc.description && (
                                    <Typography
                                        sx={{
                                            color: "rgba(255,255,255,0.4)",
                                            fontSize: "0.85rem",
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {svc.description}
                                    </Typography>
                                )}

                                {/* Metadata chips */}
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <Chip
                                        label={`Authorized ${new Date(svc.first_authorized).toLocaleDateString()}`}
                                        size="small"
                                        sx={{
                                            bgcolor: "rgba(255,255,255,0.05)",
                                            color: "rgba(255,255,255,0.35)",
                                            fontSize: "0.7rem",
                                            height: 22,
                                        }}
                                    />
                                    <Chip
                                        label={`Last used ${new Date(svc.last_authorized).toLocaleDateString()}`}
                                        size="small"
                                        sx={{
                                            bgcolor: "rgba(255,255,255,0.05)",
                                            color: "rgba(255,255,255,0.35)",
                                            fontSize: "0.7rem",
                                            height: 22,
                                        }}
                                    />
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
};

export default ServicesPage;
