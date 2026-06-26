"use client";

/** Public status page — light, commercial (Atlassian Statuspage style).
 * Every Elixpo service renders as its own card with a real uptime history bar:
 * 90 daily cells for the base platform (elixpo.com), 24 hourly cells for the
 * sub-services (which only retain short-window edge analytics). */

import type { DayPoint } from "@/lib/metrics";
import type {
    Health,
    ProductStatus,
    StatusPayload,
} from "@/lib/status-data";
import { GitHub, OpenInNew, Refresh } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useCallback, useEffect, useState } from "react";

const REPO = "https://github.com/elixpo/status.elixpo";

/** Client cache: serve from localStorage within the TTL to avoid re-hitting the
 * server; the refresh button bypasses this (but not the server KV cache). */
const LS_KEY = "elixpo-status-cache-v1";
const LS_TTL = 60 * 60 * 1000; // 1 hour
const REFRESH_COOLDOWN = 5000; // 5 seconds

const L = {
    bg: "#faf9f7",
    card: "#ffffff",
    border: "#e7e5e4",
    text: "#1c1917",
    muted: "#78716c",
    green: "#16a34a",
    amber: "#d97706",
    red: "#dc2626",
    grey: "#d6d3d1",
};

const theme = createTheme({
    palette: { mode: "light" },
    typography: { fontFamily: "var(--font-geist-sans), Arial, sans-serif" },
});

const HEALTH: Record<Health, { color: string; label: string }> = {
    operational: { color: L.green, label: "Operational" },
    degraded: { color: L.amber, label: "Degraded performance" },
    outage: { color: L.red, label: "Outage" },
    idle: { color: L.muted, label: "No traffic" },
};

function cellColor(d: DayPoint): string {
    if (d.total === 0) return L.grey;
    const r = d.errors / d.total;
    if (r >= 0.05) return L.red;
    if (r >= 0.01) return L.amber;
    return L.green;
}

function fmtCell(d: DayPoint | null, window: "90d" | "24h"): string {
    if (!d) return "no data";
    const when =
        window === "90d"
            ? d.date
            : new Date(d.date).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
              });
    const pct =
        d.total > 0
            ? `${(((d.total - d.errors) / d.total) * 100).toFixed(2)}%`
            : "—";
    const unit = window === "90d" ? "req" : "req/h";
    return `${when} · ${pct} · ${d.total.toLocaleString()} ${unit}`;
}

function UptimeBars({
    days,
    target,
    window,
}: { days: DayPoint[]; target: number; window: "90d" | "24h" }) {
    // Pad the left with "no data" cells so every strip is full width.
    const pad = Math.max(0, target - days.length);
    const cells = [
        ...Array.from({ length: pad }, () => null),
        ...days.slice(-target),
    ];
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "stretch",
                gap: "2px",
                height: 34,
            }}
        >
            {cells.map((d, i) => (
                <Box
                    key={i}
                    title={fmtCell(d, window)}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        borderRadius: "2px",
                        bgcolor: d ? cellColor(d) : L.grey,
                        opacity: d ? 1 : 0.4,
                        transition: "transform 0.1s",
                        "&:hover": { transform: "scaleY(1.12)" },
                    }}
                />
            ))}
        </Box>
    );
}

function relTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400_000);
    if (days <= 0) {
        const hrs = Math.floor(diff / 3600_000);
        return hrs <= 1 ? "just now" : `${hrs}h ago`;
    }
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
}

function ServiceCard({ p, hero = false }: { p: ProductStatus; hero?: boolean }) {
    const h = HEALTH[p.health];
    const is90 = p.window === "90d";
    return (
        <Box
            sx={{
                bgcolor: hero ? "#fbfdfc" : L.card,
                border: `1px solid ${hero ? h.color : L.border}`,
                borderRadius: hero ? "12px" : "10px",
                p: hero ? { xs: 2.5, md: 3 } : 2.5,
                boxShadow: hero ? "0 1px 2px rgba(28,25,23,0.04)" : "none",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    mb: hero ? 2 : 1.5,
                    flexWrap: "wrap",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        minWidth: 0,
                    }}
                >
                    {hero ? (
                        <Box
                            sx={{
                                px: 1,
                                py: 0.4,
                                borderRadius: "6px",
                                bgcolor: h.color,
                                color: "#fff",
                                fontSize: "0.62rem",
                                fontWeight: 800,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                lineHeight: 1,
                            }}
                        >
                            Platform
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                width: 9,
                                height: 9,
                                borderRadius: "50%",
                                bgcolor: h.color,
                                flexShrink: 0,
                            }}
                        />
                    )}
                    <Typography
                        sx={{
                            fontWeight: hero ? 800 : 700,
                            fontSize: hero ? "1.25rem" : "1rem",
                            letterSpacing: hero ? "-0.01em" : 0,
                        }}
                    >
                        {p.label}
                    </Typography>
                    {p.domain && (
                        <Box
                            component="a"
                            href={`https://${p.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            sx={{
                                color: L.muted,
                                fontSize: hero ? "0.84rem" : "0.78rem",
                                textDecoration: "none",
                                "&:hover": { color: L.text },
                            }}
                        >
                            {p.domain}
                        </Box>
                    )}
                </Box>
                <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                >
                    <Typography
                        sx={{
                            color: h.color,
                            fontWeight: 700,
                            fontSize: hero ? "0.98rem" : "0.88rem",
                        }}
                    >
                        {h.label}
                    </Typography>
                    <Box
                        component="a"
                        href={`${p.repo || REPO}/issues/new`}
                        target="_blank"
                        rel="noreferrer"
                        title={`Report an issue with ${p.label}`}
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            px: 1.25,
                            py: 0.5,
                            borderRadius: "7px",
                            border: `1px solid ${L.border}`,
                            color: L.muted,
                            textDecoration: "none",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            lineHeight: 1,
                            "&:hover": {
                                color: L.text,
                                borderColor: L.muted,
                                bgcolor: L.bg,
                            },
                        }}
                    >
                        <GitHub sx={{ fontSize: "0.95rem" }} />
                        Report
                    </Box>
                </Box>
            </Box>

            <UptimeBars
                days={p.days}
                target={is90 ? 90 : 24}
                window={p.window}
            />
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: 1,
                }}
            >
                <Typography sx={{ color: L.muted, fontSize: "0.74rem" }}>
                    {is90 ? "90 days ago" : "24 hours ago"}
                </Typography>
                <Typography
                    sx={{
                        color: L.muted,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                    }}
                >
                    {!p.seriesAvailable
                        ? "history unavailable"
                        : p.total > 0
                          ? `${p.uptimePct.toFixed(2)}% uptime`
                          : "no traffic"}
                </Typography>
                <Typography sx={{ color: L.muted, fontSize: "0.74rem" }}>
                    {is90 ? "Today" : "Now"}
                </Typography>
            </Box>
        </Box>
    );
}

export default function StatusView({ initial }: { initial: StatusPayload }) {
    const [data, setData] = useState<StatusPayload>(initial);
    const [refreshing, setRefreshing] = useState(false);
    const [cooling, setCooling] = useState(false);

    // On mount: prefer a still-fresh localStorage cache (avoids re-reading the
    // server within the TTL); otherwise seed the cache from the SSR payload,
    // which is itself fresh at first paint.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const c = JSON.parse(raw) as {
                    ts: number;
                    data: StatusPayload;
                };
                if (c?.data && Date.now() - c.ts < LS_TTL) {
                    setData(c.data);
                    return;
                }
            }
            localStorage.setItem(
                LS_KEY,
                JSON.stringify({ ts: Date.now(), data: initial }),
            );
        } catch {
            // localStorage unavailable (private mode / SSR) — ignore.
        }
    }, [initial]);

    // Refresh bypasses localStorage and pulls the JSON feed; rate-limited to one
    // call per cooldown window. (The server KV cache still applies.)
    const refresh = useCallback(async () => {
        if (refreshing || cooling) return;
        setRefreshing(true);
        try {
            const res = await fetch("/api/status", { cache: "no-store" });
            if (res.ok) {
                const fresh = (await res.json()) as StatusPayload;
                setData(fresh);
                try {
                    localStorage.setItem(
                        LS_KEY,
                        JSON.stringify({ ts: Date.now(), data: fresh }),
                    );
                } catch {}
            }
        } catch {
            // network hiccup — keep showing the last good data.
        } finally {
            setRefreshing(false);
            setCooling(true);
            setTimeout(() => setCooling(false), REFRESH_COOLDOWN);
        }
    }, [refreshing, cooling]);

    const { products, changelogs, fetchedAt } = data;

    const worst: Health = products.some((p) => p.health === "outage")
        ? "outage"
        : products.some((p) => p.health === "degraded")
          ? "degraded"
          : "operational";
    const allOk = worst === "operational";

    // The base platform (elixpo.com, 90-day history) renders as a distinct hero
    // card; everything else stacks below it.
    const base = products.find((p) => p.window === "90d");
    const rest = products.filter((p) => p !== base);

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ minHeight: "100dvh", bgcolor: L.bg, color: L.text }}>
                <Box
                    sx={{
                        maxWidth: 880,
                        mx: "auto",
                        px: { xs: 2, md: 3 },
                        py: { xs: 4, md: 7 },
                    }}
                >
                    {/* header */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 5,
                            flexWrap: "wrap",
                            gap: 2,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.25,
                            }}
                        >
                            <Box
                                component="img"
                                src="/icon.png"
                                alt="Elixpo"
                                sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: "7px",
                                }}
                            />
                            <Typography
                                sx={{
                                    fontWeight: 800,
                                    fontSize: "1.5rem",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                Elixpo Status
                            </Typography>
                        </Box>
                        <Box
                            title="Coming soon"
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 1,
                                height: 40,
                                px: 2,
                                borderRadius: "8px",
                                bgcolor: "#e7e5e4",
                                color: L.muted,
                                cursor: "not-allowed",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                            }}
                        >
                            Subscribe · coming soon
                        </Box>
                    </Box>

                    {/* overall banner */}
                    <Box
                        sx={{
                            mb: 5,
                            borderRadius: "10px",
                            overflow: "hidden",
                            border: `1px solid ${allOk ? L.green : L.amber}`,
                        }}
                    >
                        <Box
                            sx={{
                                px: 2.5,
                                py: 2,
                                bgcolor: allOk ? L.green : L.amber,
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Typography
                                sx={{ fontWeight: 700, fontSize: "1.05rem" }}
                            >
                                {allOk
                                    ? "All systems operational"
                                    : worst === "outage"
                                      ? "Active incident on some services"
                                      : "Some services degraded"}
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                px: 2.5,
                                py: 1.25,
                                bgcolor: L.card,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                                flexWrap: "wrap",
                            }}
                        >
                            <Typography
                                sx={{ color: L.muted, fontSize: "0.8rem" }}
                            >
                                Live from Cloudflare edge analytics · updated{" "}
                                {new Date(fetchedAt).toLocaleString()}
                            </Typography>
                            <Box
                                component="button"
                                onClick={refresh}
                                disabled={refreshing || cooling}
                                title={
                                    cooling
                                        ? "Please wait a few seconds"
                                        : "Fetch the latest status"
                                }
                                sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                    px: 1.5,
                                    py: 0.75,
                                    borderRadius: "8px",
                                    border: `1px solid ${L.border}`,
                                    bgcolor: L.bg,
                                    color: L.text,
                                    font: "inherit",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor:
                                        refreshing || cooling
                                            ? "not-allowed"
                                            : "pointer",
                                    opacity: refreshing || cooling ? 0.55 : 1,
                                    transition: "background 0.12s",
                                    "&:hover": {
                                        bgcolor:
                                            refreshing || cooling
                                                ? L.bg
                                                : "#f0eeec",
                                    },
                                }}
                            >
                                <Refresh
                                    sx={{
                                        fontSize: "1rem",
                                        animation: refreshing
                                            ? "elxspin 0.8s linear infinite"
                                            : "none",
                                        "@keyframes elxspin": {
                                            from: { transform: "rotate(0deg)" },
                                            to: { transform: "rotate(360deg)" },
                                        },
                                    }}
                                />
                                {refreshing ? "Refreshing…" : "Refresh"}
                            </Box>
                        </Box>
                    </Box>

                    {/* base platform — distinct hero card */}
                    {base && (
                        <Box sx={{ mb: 4 }}>
                            <ServiceCard p={base} hero />
                        </Box>
                    )}

                    {/* per-service cards */}
                    <Typography
                        sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 1.5 }}
                    >
                        Services
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                        }}
                    >
                        {rest.map((p) => (
                            <ServiceCard key={p.domain || p.label} p={p} />
                        ))}
                    </Box>

                    {/* recent changes (from gist changelogs) */}
                    {changelogs.length > 0 && (
                        <>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mt: 4,
                                    mb: 1.5,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: "0.95rem",
                                    }}
                                >
                                    Recent changes
                                </Typography>
                                <Box
                                    component="a"
                                    href="https://gist.github.com/elixpoo"
                                    target="_blank"
                                    rel="noreferrer"
                                    sx={{
                                        color: L.muted,
                                        fontSize: "0.78rem",
                                        textDecoration: "none",
                                        "&:hover": { color: L.text },
                                    }}
                                >
                                    All changelogs →
                                </Box>
                            </Box>
                            <Box
                                sx={{
                                    bgcolor: L.card,
                                    border: `1px solid ${L.border}`,
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                }}
                            >
                                {changelogs.map((c, i) => (
                                    <Box
                                        key={c.url}
                                        component="a"
                                        href={c.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 2,
                                            px: 2.5,
                                            py: 1.5,
                                            textDecoration: "none",
                                            borderTop:
                                                i === 0
                                                    ? "none"
                                                    : `1px solid ${L.border}`,
                                            "&:hover": { bgcolor: "#faf9f7" },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1.25,
                                                minWidth: 0,
                                            }}
                                        >
                                            <GitHub
                                                sx={{
                                                    fontSize: "1rem",
                                                    color: L.muted,
                                                }}
                                            />
                                            <Typography
                                                sx={{
                                                    color: L.text,
                                                    fontSize: "0.88rem",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {c.project}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    color: L.muted,
                                                    fontSize: "0.8rem",
                                                }}
                                            >
                                                changelog updated
                                            </Typography>
                                        </Box>
                                        <Typography
                                            sx={{
                                                color: L.muted,
                                                fontSize: "0.78rem",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {relTime(c.updatedAt)}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </>
                    )}

                    {/* footer */}
                    <Box sx={{ mt: 4, textAlign: "center" }}>
                        <Box
                            component="a"
                            href={`${REPO}/issues/new`}
                            target="_blank"
                            rel="noreferrer"
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 1,
                                color: L.muted,
                                textDecoration: "none",
                                fontSize: "0.82rem",
                                "&:hover": { color: L.text },
                            }}
                        >
                            <OpenInNew sx={{ fontSize: "1rem" }} />
                            Every Elixpo service is open source — report an
                            issue
                        </Box>
                    </Box>
                </Box>
            </Box>
        </ThemeProvider>
    );
}
