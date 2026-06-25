"use client";

import type { SvgIconComponent } from "@mui/icons-material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CodeIcon from "@mui/icons-material/Code";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import EastIcon from "@mui/icons-material/East";
import HubIcon from "@mui/icons-material/Hub";
import InsightsIcon from "@mui/icons-material/Insights";
import LockIcon from "@mui/icons-material/Lock";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PasswordIcon from "@mui/icons-material/Password";
import PublicIcon from "@mui/icons-material/Public";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import WebhookIcon from "@mui/icons-material/Webhook";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import CodeBlock from "./components/code-block";
import { GlassCard } from "./components/glass-card";
import PageShell from "./components/page-shell";
import PixelHero from "./components/pixel-hero";

const ACCENT = "#9b7bf7";
const TEXT = "#f5f5f4";
const TEXT_60 = "rgba(245,245,244,0.6)";
const TEXT_65 = "rgba(245,245,244,0.65)";

const PRIMARY_BTN = {
    textTransform: "none" as const,
    fontWeight: 700,
    fontSize: "1rem",
    color: "#fff",
    px: 3.2,
    py: 1.4,
    borderRadius: "12px",
    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
    boxShadow: "0 8px 24px rgba(124,92,255,0.4)",
    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
};

// ── Section heading helper ──────────────────────────────────────────────────
function SectionHead({
    eyebrow,
    title,
    body,
}: {
    eyebrow: string;
    title: React.ReactNode;
    body?: string;
}) {
    return (
        <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ mb: { xs: 4, md: 6 } }}>
            <Typography
                sx={{
                    color: ACCENT,
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                }}
            >
                {eyebrow}
            </Typography>
            <Typography
                component="h2"
                sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.9rem", md: "2.6rem" },
                    letterSpacing: "-0.02em",
                    lineHeight: 1.08,
                    color: TEXT,
                    maxWidth: 720,
                }}
            >
                {title}
            </Typography>
            {body && (
                <Typography
                    sx={{ maxWidth: 600, color: TEXT_65, fontSize: "1.05rem", lineHeight: 1.7 }}
                >
                    {body}
                </Typography>
            )}
        </Stack>
    );
}

// ── Auth-aware primary CTA ──────────────────────────────────────────────────
// null = still resolving session; true/false = known. Defaults to the
// signed-out label while resolving to avoid a misleading flash.
function useAuthed(): boolean | null {
    const [authed, setAuthed] = useState<boolean | null>(null);
    useEffect(() => {
        let alive = true;
        fetch("/api/auth/me", { cache: "no-store" })
            .then((r) => r.json())
            .then((d: any) => alive && setAuthed(Boolean(d?.authenticated)))
            .catch(() => alive && setAuthed(false));
        return () => {
            alive = false;
        };
    }, []);
    return authed;
}

function PrimaryCta({
    authed,
    signedOutLabel,
}: { authed: boolean | null; signedOutLabel: string }) {
    const signedIn = authed === true;
    return (
        <Button
            component={signedIn ? Link : "a"}
            href={signedIn ? "/dashboard" : "/api/auth/login"}
            endIcon={<ArrowForwardIcon sx={{ fontSize: "1.1rem !important" }} />}
            sx={PRIMARY_BTN}
        >
            {signedIn ? "Go to your dashboard" : signedOutLabel}
        </Button>
    );
}

// ── Data ────────────────────────────────────────────────────────────────────
const STEPS: { icon: SvgIconComponent; title: string; body: string; accent: string }[] = [
    {
        icon: VpnKeyIcon,
        title: "Connect a sender",
        body: "Add your mailbox — email + app password. Stored encrypted, never returned.",
        accent: "#9b7bf7",
    },
    {
        icon: DesignServicesIcon,
        title: "Design a template",
        body: "Compose in a visual editor with {{variable}} placeholders and a live preview.",
        accent: "#86efac",
    },
    {
        icon: WebhookIcon,
        title: "Trigger via webhook",
        body: "POST an event with per-config credentials. We merge variables and send.",
        accent: "#5fb6ff",
    },
    {
        icon: InsightsIcon,
        title: "Track delivery",
        body: "Every send is logged with status, recipient, and resolved variables.",
        accent: "#fbbf24",
    },
];

const FEATURES: { icon: SvgIconComponent; title: string; body: string; accent: string }[] = [
    {
        icon: VpnKeyIcon,
        title: "Bring your own sender",
        body: "Connect any mailbox with an email and app password. Your sender, your domain, your reputation — encrypted at rest and never locked in.",
        accent: "#9b7bf7",
    },
    {
        icon: DesignServicesIcon,
        title: "Visual template editor",
        body: "Design emails in a WYSIWYG editor with {{variable}} placeholders and a live preview that renders exactly what recipients will see.",
        accent: "#86efac",
    },
    {
        icon: WebhookIcon,
        title: "Trigger from your stack",
        body: "Fire a single webhook from your service with per-config client credentials. We resolve variables into your template and deliver.",
        accent: "#5fb6ff",
    },
    {
        icon: BoltIcon,
        title: "Event-based, not batch",
        body: "Welcome emails, receipts, password resets, alerts — every send is a single, idempotent, traceable event, not a campaign.",
        accent: "#fbbf24",
    },
    {
        icon: CodeIcon,
        title: "No mail infra to build",
        body: "Skip SMTP plumbing, retries, queues, and template engines. One dashboard and one endpoint, and you are sending.",
        accent: "#c4b5fd",
    },
    {
        icon: MarkEmailReadIcon,
        title: "Delivery logs",
        body: "Each triggered send is recorded with status, recipient, and the variables it resolved — searchable from your dashboard.",
        accent: "#ff7cc9",
    },
];

const USE_CASES: { icon: SvgIconComponent; label: string }[] = [
    { icon: ReceiptLongIcon, label: "Receipts" },
    { icon: WavingHandIcon, label: "Welcome emails" },
    { icon: PasswordIcon, label: "Password resets" },
    { icon: LockIcon, label: "OTP & verification" },
    { icon: NotificationsActiveIcon, label: "Alerts" },
    { icon: MarkEmailReadIcon, label: "Confirmations" },
];

const TRUST: { icon: SvgIconComponent; label: string }[] = [
    { icon: HubIcon, label: "Single sign-on via Elixpo Accounts" },
    { icon: LockIcon, label: "Sender credentials encrypted at rest" },
    { icon: PublicIcon, label: "Delivered on Cloudflare's global edge" },
];

const WEBHOOK_EXAMPLE = `curl -X POST https://mail.elixpo.com/v1/send \\
  -H "Authorization: Bearer lix_mail_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "config": "welcome-email",
    "to": "ada@example.com",
    "variables": { "name": "Ada", "product": "Acme" }
  }'`;

export default function Home() {
    const authed = useAuthed();
    return (
        <PageShell variant="default">
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <PixelHero authed={authed} />

            {/* ── See it work: request → delivery + trust ──────────────────── */}
            <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 8 }, pb: { xs: 4, md: 6 } }}>
                {/* Request → delivery artifact */}
                <Box
                    sx={{
                        maxWidth: 900,
                        mx: "auto",
                        display: "grid",
                        gap: 2.5,
                        gridTemplateColumns: { xs: "1fr", md: "1.35fr 1fr" },
                        alignItems: "stretch",
                    }}
                >
                    <Box>
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mb: 1, color: "rgba(245,245,244,0.55)" }}
                        >
                            <EastIcon sx={{ fontSize: 18, color: ACCENT }} />
                            <Typography
                                sx={{
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    letterSpacing: "0.02em",
                                }}
                            >
                                Your service fires one request
                            </Typography>
                        </Stack>
                        <CodeBlock code={WEBHOOK_EXAMPLE} language="bash" />
                    </Box>

                    {/* Delivery result panel */}
                    <GlassCard
                        sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <CheckCircleIcon sx={{ fontSize: 20, color: "#86efac" }} />
                            <Typography sx={{ fontWeight: 700, color: TEXT, fontSize: "0.95rem" }}>
                                Delivered
                            </Typography>
                            <Chip
                                label="sent"
                                size="small"
                                sx={{
                                    ml: "auto",
                                    height: 22,
                                    bgcolor: "rgba(134,239,172,0.12)",
                                    color: "#86efac",
                                    fontWeight: 700,
                                    fontSize: "0.7rem",
                                    border: "1px solid rgba(134,239,172,0.3)",
                                }}
                            />
                        </Stack>
                        <Stack
                            spacing={1.1}
                            sx={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.8rem" }}
                        >
                            {[
                                ["to", "ada@example.com"],
                                ["template", "welcome-email"],
                                ["sender", "you@yourdomain.com"],
                                ["subject", "Welcome to Acme, Ada"],
                            ].map(([k, v]) => (
                                <Stack
                                    key={k}
                                    direction="row"
                                    spacing={1.5}
                                    justifyContent="space-between"
                                >
                                    <Box component="span" sx={{ color: "rgba(245,245,244,0.4)" }}>
                                        {k}
                                    </Box>
                                    <Box
                                        component="span"
                                        sx={{ color: "rgba(245,245,244,0.82)", textAlign: "right" }}
                                    >
                                        {v}
                                    </Box>
                                </Stack>
                            ))}
                        </Stack>
                    </GlassCard>
                </Box>

                {/* Trust strip */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 1.5, sm: 4 }}
                    justifyContent="center"
                    alignItems="center"
                    sx={{ mt: { xs: 5, md: 7 }, flexWrap: "wrap", rowGap: 1.5 }}
                >
                    {TRUST.map((t) => (
                        <Stack key={t.label} direction="row" spacing={1} alignItems="center">
                            <t.icon sx={{ fontSize: 18, color: "rgba(155,123,247,0.85)" }} />
                            <Typography
                                sx={{
                                    color: "rgba(245,245,244,0.55)",
                                    fontSize: "0.85rem",
                                    fontWeight: 500,
                                }}
                            >
                                {t.label}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
            </Container>

            {/* ── How it works ─────────────────────────────────────────────── */}
            <Box sx={{ py: { xs: 6, md: 11 } }}>
                <Container maxWidth="lg">
                    <SectionHead
                        eyebrow="How it works"
                        title="From event to inbox in four steps"
                        body="No SMTP servers to run, no template engine to wire up. Configure once, then trigger sends from anywhere in your stack."
                    />
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={{ xs: 3.5, md: 1 }}
                        alignItems={{ xs: "flex-start", md: "stretch" }}
                    >
                        {STEPS.map((s, i) => (
                            <Stack
                                key={s.title}
                                direction={{ xs: "row", md: "column" }}
                                spacing={{ xs: 2, md: 0 }}
                                sx={{ flex: 1, position: "relative" }}
                            >
                                <Box sx={{ position: "relative", mb: { md: 2 } }}>
                                    <Box
                                        sx={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: "16px",
                                            display: "grid",
                                            placeItems: "center",
                                            color: s.accent,
                                            background: `${s.accent}14`,
                                            border: `1px solid ${s.accent}40`,
                                        }}
                                    >
                                        <s.icon sx={{ fontSize: 26 }} />
                                    </Box>
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: -8,
                                            right: -8,
                                            width: 22,
                                            height: 22,
                                            borderRadius: "50%",
                                            display: "grid",
                                            placeItems: "center",
                                            fontSize: "0.7rem",
                                            fontWeight: 800,
                                            color: "#0b0d12",
                                            background: s.accent,
                                        }}
                                    >
                                        {i + 1}
                                    </Box>
                                </Box>
                                <Box sx={{ pr: { md: 2.5 } }}>
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: "1.05rem",
                                            color: TEXT,
                                            mb: 0.6,
                                        }}
                                    >
                                        {s.title}
                                    </Typography>
                                    <Typography
                                        sx={{ color: TEXT_60, fontSize: "0.9rem", lineHeight: 1.6 }}
                                    >
                                        {s.body}
                                    </Typography>
                                </Box>
                            </Stack>
                        ))}
                    </Stack>
                </Container>
            </Box>

            {/* ── Features (icon + text artifacts, no cards) ──────────────────── */}
            <Box id="features" sx={{ py: { xs: 6, md: 10 }, scrollMarginTop: "80px" }}>
                <Container maxWidth="lg">
                    <SectionHead
                        eyebrow="Capabilities"
                        title="Everything you need to send"
                        body="A multi-tenant transactional email layer — your sender, your templates, your triggers, on the edge."
                    />
                    <Box
                        sx={{
                            display: "grid",
                            columnGap: { xs: 4, md: 6 },
                            rowGap: { xs: 4.5, md: 6 },
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                                md: "repeat(3, 1fr)",
                            },
                        }}
                    >
                        {FEATURES.map((f) => (
                            <Box key={f.title} sx={{ maxWidth: 360 }}>
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: "12px",
                                        display: "grid",
                                        placeItems: "center",
                                        mb: 1.8,
                                        color: f.accent,
                                        background: `${f.accent}14`,
                                        border: `1px solid ${f.accent}33`,
                                    }}
                                >
                                    <f.icon sx={{ fontSize: 22 }} />
                                </Box>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: "1.08rem",
                                        color: TEXT,
                                        mb: 0.8,
                                    }}
                                >
                                    {f.title}
                                </Typography>
                                <Typography
                                    sx={{ color: TEXT_60, fontSize: "0.92rem", lineHeight: 1.7 }}
                                >
                                    {f.body}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ── Use cases ────────────────────────────────────────────────── */}
            <Box sx={{ py: { xs: 5, md: 8 } }}>
                <Container maxWidth="md">
                    <Stack alignItems="center" textAlign="center" spacing={3}>
                        <Typography
                            sx={{
                                color: "rgba(245,245,244,0.5)",
                                fontSize: "0.88rem",
                                fontWeight: 600,
                                letterSpacing: "0.02em",
                            }}
                        >
                            Built for every transactional moment
                        </Typography>
                        <Stack
                            direction="row"
                            spacing={1.2}
                            justifyContent="center"
                            sx={{ flexWrap: "wrap", gap: 1.2 }}
                        >
                            {USE_CASES.map((u) => (
                                <Stack
                                    key={u.label}
                                    direction="row"
                                    spacing={0.9}
                                    alignItems="center"
                                    sx={{
                                        px: 1.8,
                                        py: 1,
                                        borderRadius: "999px",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        background: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    <u.icon sx={{ fontSize: 17, color: ACCENT }} />
                                    <Typography
                                        sx={{
                                            color: "rgba(245,245,244,0.8)",
                                            fontSize: "0.85rem",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {u.label}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            {/* ── Integration ──────────────────────────────────────────────── */}
            <Box sx={{ py: { xs: 6, md: 10 } }}>
                <Container maxWidth="lg">
                    <Box
                        sx={{
                            display: "grid",
                            gap: { xs: 4, md: 6 },
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1.2fr" },
                            alignItems: "center",
                        }}
                    >
                        <Box>
                            <Typography
                                sx={{
                                    color: ACCENT,
                                    fontWeight: 700,
                                    fontSize: "0.78rem",
                                    letterSpacing: "0.14em",
                                    textTransform: "uppercase",
                                    mb: 1.5,
                                }}
                            >
                                Integrate in minutes
                            </Typography>
                            <Typography
                                component="h2"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: { xs: "1.8rem", md: "2.4rem" },
                                    letterSpacing: "-0.02em",
                                    lineHeight: 1.1,
                                    color: TEXT,
                                    mb: 2,
                                }}
                            >
                                One endpoint. Any language.
                            </Typography>
                            <Typography
                                sx={{
                                    color: TEXT_65,
                                    fontSize: "1.02rem",
                                    lineHeight: 1.75,
                                    mb: 2.5,
                                }}
                            >
                                Each email config issues its own client credentials — shown once,
                                stored hashed. Authenticate with a Bearer token, name a template and
                                a recipient, pass your variables, and we render an email-safe
                                message and relay it through your sender.
                            </Typography>
                            <Stack spacing={1.4}>
                                {[
                                    "Per-config client_id + secret you can rotate",
                                    "Idempotent sends — safe to retry",
                                    "Every request recorded in delivery logs",
                                ].map((line) => (
                                    <Stack
                                        key={line}
                                        direction="row"
                                        spacing={1.2}
                                        alignItems="center"
                                    >
                                        <CheckCircleIcon sx={{ fontSize: 18, color: "#86efac" }} />
                                        <Typography
                                            sx={{
                                                color: "rgba(245,245,244,0.78)",
                                                fontSize: "0.92rem",
                                            }}
                                        >
                                            {line}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Box>
                        <CodeBlock code={WEBHOOK_EXAMPLE} language="bash" />
                    </Box>
                </Container>
            </Box>

            {/* ── Closing CTA ──────────────────────────────────────────────── */}
            <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
                <GlassCard
                    sx={{
                        textAlign: "center",
                        py: { xs: 5, md: 7 },
                        background:
                            "linear-gradient(160deg, rgba(155,123,247,0.12) 0%, rgba(124,92,255,0.05) 100%)",
                        border: "1px solid rgba(155,123,247,0.25)",
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: "1.6rem", md: "2.2rem" },
                            letterSpacing: "-0.02em",
                            mb: 1.2,
                        }}
                    >
                        Ship your first email today
                    </Typography>
                    <Typography
                        sx={{ color: TEXT_65, fontSize: "1rem", maxWidth: 480, mx: "auto", mb: 3 }}
                    >
                        Connect a sender, design a template, and trigger a send in minutes — no SMTP
                        servers, no template engines, no queues.
                    </Typography>
                    <PrimaryCta authed={authed} signedOutLabel="Sign in with Elixpo" />
                </GlassCard>
            </Container>
        </PageShell>
    );
}
