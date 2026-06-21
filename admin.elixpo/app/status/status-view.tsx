"use client";

/** Public status page — light, commercial (Atlassian Statuspage style):
 * a real 90-day platform uptime history bar + per-service live rows. */

import type { ChangeLogItem } from "@/lib/changelog";
import type { DailyUptime, DayPoint } from "@/lib/metrics";
import { GitHub, OpenInNew } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const REPO = "https://github.com/Circuit-Overtime/admin.elixpo";

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

export type Health = "operational" | "degraded" | "outage" | "idle";

export interface ProductStatus {
    label: string;
    domain?: string;
    repo?: string;
    total: number;
    availability: number;
    health: Health;
    status: { label: string; count: number }[];
}

const HEALTH: Record<Health, { color: string; label: string }> = {
    operational: { color: L.green, label: "Operational" },
    degraded: { color: L.amber, label: "Degraded performance" },
    outage: { color: L.red, label: "Outage" },
    idle: { color: L.muted, label: "No traffic" },
};

function dayColor(d: DayPoint): string {
    if (d.total === 0) return L.grey;
    const r = d.errors / d.total;
    if (r >= 0.05) return L.red;
    if (r >= 0.01) return L.amber;
    return L.green;
}

function UptimeBars({
    days,
    target = 90,
}: { days: DayPoint[]; target?: number }) {
    // Pad the left with "no data" days so the strip is always full width.
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
                    title={
                        d
                            ? `${d.date} · ${d.total > 0 ? (((d.total - d.errors) / d.total) * 100).toFixed(2) : "—"}% · ${d.total.toLocaleString()} req`
                            : "no data"
                    }
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        borderRadius: "2px",
                        bgcolor: d ? dayColor(d) : L.grey,
                        opacity: d ? 1 : 0.4,
                        transition: "transform 0.1s",
                        "&:hover": { transform: "scaleY(1.12)" },
                    }}
                />
            ))}
        </Box>
    );
}

function serviceSegments(status: { label: string; count: number }[]) {
    const classes = [
        { color: L.green, lo: 200, hi: 400 },
        { color: L.amber, lo: 400, hi: 500 },
        { color: L.red, lo: 500, hi: 600 },
    ];
    const total = status.reduce((a, s) => a + s.count, 0) || 1;
    return classes
        .map((c) => ({
            color: c.color,
            pct:
                (status
                    .filter(
                        (s) =>
                            Number(s.label) >= c.lo && Number(s.label) < c.hi,
                    )
                    .reduce((a, s) => a + s.count, 0) /
                    total) *
                100,
        }))
        .filter((s) => s.pct > 0);
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

export default function StatusView({
    products,
    uptime,
    changelogs,
    fetchedAt,
}: {
    products: ProductStatus[];
    uptime: DailyUptime;
    changelogs: ChangeLogItem[];
    fetchedAt: number;
}) {
    const worst: Health = products.some((p) => p.health === "outage")
        ? "outage"
        : products.some((p) => p.health === "degraded")
          ? "degraded"
          : "operational";
    const allOk = worst === "operational";

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
                        <Box sx={{ px: 2.5, py: 1.25, bgcolor: L.card }}>
                            <Typography
                                sx={{ color: L.muted, fontSize: "0.8rem" }}
                            >
                                Live from Cloudflare edge analytics · updated{" "}
                                {new Date(fetchedAt).toLocaleString()}
                            </Typography>
                        </Box>
                    </Box>

                    {/* platform 90-day uptime */}
                    <Typography
                        sx={{
                            color: L.muted,
                            fontSize: "0.82rem",
                            textAlign: "right",
                            mb: 1,
                        }}
                    >
                        Uptime over the past 90 days.
                    </Typography>
                    <Box
                        sx={{
                            bgcolor: L.card,
                            border: `1px solid ${L.border}`,
                            borderRadius: "10px",
                            p: 2.5,
                            mb: 4,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mb: 1.5,
                            }}
                        >
                            <Typography
                                sx={{ fontWeight: 700, fontSize: "1rem" }}
                            >
                                Elixpo platform · elixpo.com
                            </Typography>
                            <Typography
                                sx={{
                                    color: L.green,
                                    fontWeight: 700,
                                    fontSize: "0.9rem",
                                }}
                            >
                                Operational
                            </Typography>
                        </Box>
                        {uptime.available && uptime.days.length > 0 ? (
                            <>
                                <UptimeBars days={uptime.days} />
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        mt: 1,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: L.muted,
                                            fontSize: "0.74rem",
                                        }}
                                    >
                                        90 days ago
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: L.muted,
                                            fontSize: "0.78rem",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {uptime.uptimePct.toFixed(2)}% uptime
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: L.muted,
                                            fontSize: "0.74rem",
                                        }}
                                    >
                                        Today
                                    </Typography>
                                </Box>
                            </>
                        ) : (
                            <Typography
                                sx={{ color: L.muted, fontSize: "0.82rem" }}
                            >
                                Historical uptime unavailable.
                            </Typography>
                        )}
                    </Box>

                    {/* per-service rows */}
                    <Typography
                        sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 1.5 }}
                    >
                        Services
                    </Typography>
                    <Box
                        sx={{
                            bgcolor: L.card,
                            border: `1px solid ${L.border}`,
                            borderRadius: "10px",
                            overflow: "hidden",
                        }}
                    >
                        {products.map((p, i) => {
                            const h = HEALTH[p.health];
                            const segs = serviceSegments(p.status);
                            return (
                                <Box
                                    key={p.label}
                                    sx={{
                                        px: 2.5,
                                        py: 2,
                                        borderTop:
                                            i === 0
                                                ? "none"
                                                : `1px solid ${L.border}`,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 2,
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
                                            <Box
                                                sx={{
                                                    width: 9,
                                                    height: 9,
                                                    borderRadius: "50%",
                                                    bgcolor: h.color,
                                                }}
                                            />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: "0.92rem",
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
                                                            fontSize: "0.76rem",
                                                            textDecoration:
                                                                "none",
                                                            "&:hover": {
                                                                color: L.text,
                                                            },
                                                        }}
                                                    >
                                                        {p.domain}
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 2,
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    color: h.color,
                                                    fontWeight: 600,
                                                    fontSize: "0.84rem",
                                                }}
                                            >
                                                {h.label}
                                            </Typography>
                                            {p.repo && (
                                                <Box
                                                    component="a"
                                                    href={`${p.repo}/issues`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="Issues"
                                                    sx={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 0.5,
                                                        color: L.muted,
                                                        textDecoration: "none",
                                                        fontSize: "0.78rem",
                                                        "&:hover": {
                                                            color: L.text,
                                                        },
                                                    }}
                                                >
                                                    <GitHub
                                                        sx={{
                                                            fontSize: "1rem",
                                                        }}
                                                    />
                                                    Issues
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                    {/* 24h availability strip */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            mt: 1.25,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                flex: 1,
                                                display: "flex",
                                                height: 8,
                                                borderRadius: "4px",
                                                overflow: "hidden",
                                                bgcolor: "#f0eeec",
                                            }}
                                        >
                                            {p.total > 0 ? (
                                                segs.map((s, j) => (
                                                    <Box
                                                        key={j}
                                                        sx={{
                                                            width: `${s.pct}%`,
                                                            bgcolor: s.color,
                                                        }}
                                                    />
                                                ))
                                            ) : (
                                                <Box
                                                    sx={{
                                                        width: "100%",
                                                        bgcolor: L.grey,
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Typography
                                            sx={{
                                                color: L.muted,
                                                fontSize: "0.74rem",
                                                whiteSpace: "nowrap",
                                                minWidth: 130,
                                                textAlign: "right",
                                            }}
                                        >
                                            {p.total > 0
                                                ? `${p.availability.toFixed(2)}% · ${p.total.toLocaleString()} req / 24h`
                                                : "no traffic · 24h"}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
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
