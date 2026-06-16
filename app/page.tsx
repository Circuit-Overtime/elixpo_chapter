"use client";

import { Box, Container, Typography } from "@mui/material";
import Footer from "./components/footer";
import Navbar from "./components/navbar";
import PixelHero from "./components/pixel-hero";

interface Tile {
    title: string;
    body: string;
    accent: string;
    area: { xs: string; md: string };
    big?: boolean;
}

const TILES: Tile[] = [
    {
        title: "Hosted checkout",
        body: "A signed handoff from your app opens a branded, edge-served checkout. Razorpay (INR) today; Stripe, PayPal and more behind the same adapter — your code never touches a card.",
        accent: "#9b7bf7",
        area: { xs: "auto", md: "span 7 / span 7" },
        big: true,
    },
    {
        title: "Entitlements & grants",
        body: "Every charge grants a tier with an expiry, fires a signed webhook, and is queryable at /v1/entitlements.",
        accent: "#86efac",
        area: { xs: "auto", md: "span 5 / span 5" },
    },
    {
        title: "Bring your own keys",
        body: "Connect your own Razorpay/Stripe accounts, or let Elixpo be merchant-of-record. You own the customer and the funds.",
        accent: "#5fb6ff",
        area: { xs: "auto", md: "span 5 / span 5" },
    },
    {
        title: "Unified ledger",
        body: "Immutable, double-entry by design. Idempotent money ops and replay-safe webhooks from day one — wallets, payouts and pools build on top.",
        accent: "#fbbf24",
        area: { xs: "auto", md: "span 4 / span 4" },
    },
    {
        title: "Creator payouts",
        body: "Subscriber-pool splits, marketplace payouts and revenue-share — settled via RazorpayX or Stripe Connect.",
        accent: "#c4b5fd",
        area: { xs: "auto", md: "span 4 / span 4" },
    },
    {
        title: "One identity, one API",
        body: "Merchants sign in with Elixpo Accounts, manage products and pricing in the dashboard, and call one API.",
        accent: "#ff7cc9",
        area: { xs: "auto", md: "span 4 / span 4" },
    },
];

const STEPS = [
    { n: "01", t: "Connect", d: "Sign in with Elixpo Accounts, create an app, add your provider keys." },
    { n: "02", t: "List", d: "Define products and regional prices in the dashboard — or via the API." },
    { n: "03", t: "Collect", d: "Redirect to hosted checkout; receive grants, entitlements and payouts." },
];

export default function Home() {
    return (
        <Box sx={{ position: "relative", minHeight: "100vh", color: "#f5f5f4", bgcolor: "#0b0d12" }}>
            <Box sx={{ position: "sticky", top: 0, zIndex: 1000 }}>
                <Navbar />
            </Box>

            <PixelHero />

            {/* ── Bento feature section ───────────────────────────────────── */}
            <Box id="platform" sx={{ position: "relative", py: { xs: 7, md: 12 }, scrollMarginTop: "80px" }}>
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "radial-gradient(60vmax 40vmax at 80% 0%, rgba(95,182,255,0.06), transparent 60%), radial-gradient(50vmax 40vmax at 10% 100%, rgba(155,123,247,0.07), transparent 60%)",
                        pointerEvents: "none",
                    }}
                />
                <Container maxWidth="lg" sx={{ position: "relative" }}>
                    <Box sx={{ mb: { xs: 4, md: 6 }, maxWidth: 640 }}>
                        <Typography sx={{ color: "#b69aff", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1 }}>
                            The platform
                        </Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.9rem", md: "2.6rem" }, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                            Everything billing needs, on one rail
                        </Typography>
                        <Typography sx={{ color: "rgba(245,245,244,0.6)", mt: 1.5, fontSize: "1.02rem", lineHeight: 1.7 }}>
                            Charge-in and pay-out, abstracted behind a single API, ledger and dashboard — so you ship monetization instead of plumbing.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: { xs: "1fr", md: "repeat(12, 1fr)" },
                            gridAutoRows: { md: "minmax(150px, auto)" },
                        }}
                    >
                        {TILES.map((tile) => (
                            <Box
                                key={tile.title}
                                sx={{
                                    gridColumn: tile.area,
                                    gridRow: tile.big ? { md: "span 2" } : undefined,
                                    position: "relative",
                                    overflow: "hidden",
                                    p: { xs: 3, md: 3.5 },
                                    borderRadius: "20px",
                                    display: "flex",
                                    flexDirection: "column",
                                    background: "#0e1117",
                                    border: "1px solid rgba(255,255,255,0.04)",
                                    boxShadow:
                                        "10px 10px 30px rgba(0,0,0,0.5), -8px -8px 22px rgba(255,255,255,0.022)",
                                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                    "&:hover": {
                                        transform: "translateY(-3px)",
                                        boxShadow:
                                            "14px 14px 40px rgba(0,0,0,0.58), -10px -10px 26px rgba(255,255,255,0.03)",
                                    },
                                }}
                            >
                                <AccentDot accent={tile.accent} />
                                <Typography sx={{ fontWeight: 700, fontSize: tile.big ? "1.5rem" : "1.15rem", mb: 1, mt: 1.5 }}>
                                    {tile.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: "rgba(245,245,244,0.62)",
                                        fontSize: tile.big ? "1rem" : "0.92rem",
                                        lineHeight: 1.65,
                                        maxWidth: tile.big ? 460 : "none",
                                    }}
                                >
                                    {tile.body}
                                </Typography>

                                {tile.big && (
                                    <Box sx={{ mt: "auto", pt: 3 }}>
                                        <MockCheckout />
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ── Steps ───────────────────────────────────────────────────── */}
            <Container id="start" maxWidth="lg" sx={{ pb: { xs: 7, md: 12 }, scrollMarginTop: "80px" }}>
                <Typography sx={{ textAlign: "center", fontWeight: 800, fontSize: { xs: "1.7rem", md: "2.2rem" }, letterSpacing: "-0.02em", mb: 1 }}>
                    Live in three steps
                </Typography>
                <Typography sx={{ textAlign: "center", color: "rgba(245,245,244,0.55)", mb: { xs: 4, md: 6 } }}>
                    From sign-in to your first captured payment.
                </Typography>
                <Box
                    sx={{
                        display: "grid",
                        gap: 2.5,
                        gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                        position: "relative",
                    }}
                >
                    {STEPS.map((s) => (
                        <Box
                            key={s.n}
                            sx={{
                                p: 3.5,
                                borderRadius: "18px",
                                background: "#0e1117",
                                border: "1px solid rgba(255,255,255,0.04)",
                                boxShadow:
                                    "8px 8px 24px rgba(0,0,0,0.45), -6px -6px 18px rgba(255,255,255,0.02)",
                            }}
                        >
                            <Typography sx={{ fontWeight: 800, fontSize: "1.7rem", color: "#9b7bf7", opacity: 0.85, fontFamily: "var(--font-geist-mono)" }}>
                                {s.n}
                            </Typography>
                            <Typography sx={{ fontWeight: 700, fontSize: "1.15rem", mt: 0.8 }}>{s.t}</Typography>
                            <Typography sx={{ color: "rgba(245,245,244,0.6)", fontSize: "0.92rem", mt: 0.6, lineHeight: 1.65 }}>
                                {s.d}
                            </Typography>
                        </Box>
                    ))}
                </Box>
                <Typography sx={{ mt: 6, textAlign: "center", color: "rgba(245,245,244,0.38)", fontSize: "0.85rem" }}>
                    P0 · first-party billing for blogs.elixpo · Razorpay INR · multi-tenant SaaS rolling out
                </Typography>
            </Container>

            <Footer />
        </Box>
    );
}

/* Neumorphic embossed icon chip used in each bento tile. */
function AccentDot({ accent }: { accent: string }) {
    return (
        <Box
            sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: "#0e1117",
                boxShadow:
                    "inset 3px 3px 6px rgba(0,0,0,0.55), inset -3px -3px 6px rgba(255,255,255,0.03)",
            }}
        >
            <Box
                sx={{
                    width: 13,
                    height: 13,
                    borderRadius: "4px",
                    background: accent,
                    boxShadow: `0 0 12px ${accent}aa`,
                }}
            />
        </Box>
    );
}

/**
 * A faithful but NON-INTERACTIVE artifact of the hosted checkout — framed in a
 * faux browser window and tagged "preview" so it reads as an interface render,
 * not a button a visitor could click by mistake. pointerEvents disabled.
 */
function MockCheckout() {
    return (
        <Box
            aria-hidden
            sx={{
                position: "relative",
                maxWidth: 360,
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#0b0d12",
                boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
                userSelect: "none",
                pointerEvents: "none",
            }}
        >
            {/* window chrome */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.025)",
                }}
            >
                <Box sx={{ display: "flex", gap: 0.6 }}>
                    {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                        <Box key={c} sx={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.55 }} />
                    ))}
                </Box>
                <Box
                    sx={{
                        flexGrow: 1,
                        ml: 0.5,
                        px: 1,
                        py: 0.3,
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.35)",
                        fontFamily: "var(--font-geist-mono)",
                        fontSize: "0.66rem",
                        color: "rgba(245,245,244,0.4)",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    payouts.elixpo.com/checkout
                </Box>
            </Box>

            {/* preview tag */}
            <Box
                sx={{
                    position: "absolute",
                    top: 44,
                    right: 12,
                    px: 0.9,
                    py: 0.2,
                    borderRadius: "999px",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(245,245,244,0.5)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                }}
            >
                Preview
            </Box>

            {/* checkout body */}
            <Box sx={{ p: 2.2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: "6px", background: "linear-gradient(135deg, #9b7bf7, #7c5cff)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>
                        ₹
                    </Box>
                    <Typography sx={{ fontSize: "0.8rem", color: "rgba(245,245,244,0.6)" }}>Elixpo Pay</Typography>
                </Box>
                <Typography sx={{ fontSize: "0.75rem", color: "rgba(245,245,244,0.45)" }}>Blogs Member</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", mt: 0.2 }}>
                    ₹199 <Box component="span" sx={{ fontSize: "0.8rem", fontWeight: 400, color: "rgba(245,245,244,0.45)" }}>/ 30 days</Box>
                </Typography>
                <Box
                    sx={{
                        mt: 1.5,
                        height: 38,
                        borderRadius: "10px",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#fff",
                        background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
                        opacity: 0.92,
                    }}
                >
                    Pay ₹199
                </Box>
            </Box>
        </Box>
    );
}
