"use client";

import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import {
    ArrowRightCircle,
    Fingerprint,
    Lock,
    LockKeyhole,
    Menu,
    Network,
    X,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Footer from "./components/footer";

// CSS Variables (from prompt specifications):
// --font-heading: 'Helvetica Now Display Bold', sans-serif;
// --font-body: 'Inter', sans-serif;
// --color-text: #192837;
// --color-accent: #ff7759;
// --color-login-bg: #F2F2EE;

const MARKETING_LINKS = [
    { label: "Home", href: "/" },
    { label: "Pricing", href: "/pricing" },
    { label: "Docs", href: "/docs" },
    { label: "About", href: "/about" },
];

const APP_LINKS = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "OAuth Apps", href: "/dashboard/oauth-apps" },
    { label: "Services", href: "/dashboard/services" },
    { label: "Webhooks", href: "/dashboard/webhooks" },
    { label: "Docs", href: "/docs" },
    { label: "Pricing", href: "/pricing" },
    { label: "Profile", href: "/dashboard/profile" },
];

const FEATURES = [
    {
        icon: Zap,
        title: "Sign in once",
        body: "Use your Elixpo account on any Elixpo site without making a new login — no separate passwords, no juggling logins.",
        soon: false,
    },
    {
        icon: Fingerprint,
        title: "Choose how to sign in",
        body: "WebAuthn passkeys, email + password, Google, or GitHub — pick whichever sign-in method you prefer.",
        soon: false,
    },
    {
        icon: Network,
        title: "Manage profile in one place",
        body: "Update your display name, picture, and bio from your developer portal. Every connected Elixpo product stays in sync.",
        soon: false,
    },
    {
        icon: Lock,
        title: "Delete account properly",
        body: "One click removes your account from every Elixpo product — ensuring no orphaned developer data is left behind.",
        soon: false,
    },
];

export default function LandingPage() {
    const [authed, setAuthed] = useState<boolean | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/me", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: any) => {
                if (!cancelled) setAuthed(!!d?.email);
            })
            .catch(() => {
                if (!cancelled) setAuthed(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // GSAP staggered animation for hero elements and cards on mount
    useEffect(() => {
        gsap.fromTo(
            ".gsap-hero-animate",
            { opacity: 0, y: 35 },
            {
                opacity: 1,
                y: 0,
                duration: 0.9,
                stagger: 0.15,
                ease: "power4.out",
            },
        );

        gsap.fromTo(
            ".gsap-card-animate",
            { opacity: 0, y: 30 },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "power3.out",
                delay: 0.4,
            },
        );
    }, []);

    return (
        <div className="relative w-full min-h-screen font-body text-[var(--fg)] bg-[var(--bg)] selection:bg-[#ff7759] selection:text-white overflow-x-hidden">
            <style>{`
                .font-heading { font-family: var(--font-heading), sans-serif; }
                .font-body { font-family: var(--font-body), sans-serif; }
            `}</style>

            {/* HERO SECTION */}
            <section className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden z-0">
                {/* Full-screen Background Video */}
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="absolute inset-0 object-cover w-full h-full -z-10 pointer-events-none select-none"
                    style={{ opacity: 0.6, filter: "saturate(0.92)" }}
                    src="/hero-bg.mp4"
                />

                {/* Cream wash — dims the video so the text leads */}
                <div
                    className="absolute inset-0 -z-10 pointer-events-none opacity-[0.55]"
                    style={{ background: "var(--bg)" }}
                />
                {/* Vignette — darkens the edges toward the centre */}
                <div
                    className="absolute inset-0 -z-10 pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(ellipse at center, rgba(242,242,238,0) 38%, rgba(25,40,55,0.22) 100%)",
                    }}
                />
                {/* Bottom fade — flows the hero into the sections below */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-44 -z-10 pointer-events-none"
                    style={{
                        backgroundImage:
                            "linear-gradient(to bottom, transparent, var(--bg))",
                    }}
                />

                {/* Navbar */}
                <header className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between z-25">
                    {/* Left: Panda Mascot Logo + App Title */}
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/LOGO/logo.png"
                            alt="Elixpo Mascot"
                            className="w-8 h-8 rounded-lg object-contain bg-white/80 p-0.5"
                        />
                        <span className="font-heading text-xl font-bold tracking-tight text-[var(--fg)]">
                            Elixpo{" "}
                            <span className="text-[#ff7759]">Accounts</span>
                        </span>
                    </Link>

                    {/* Right: CTAs only — brand-minimal navbar */}
                    <div className="hidden md:flex items-center gap-3">
                        {authed === null ? (
                            // Loading state placeholder to prevent layout shifting
                            <div className="w-[104px] h-[38px]" />
                        ) : authed ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="bg-[#ff7759] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:scale-[1.04] hover:brightness-110 active:scale-[0.96] transition-all duration-200 shadow-[0_4px_14px_rgba(255,119,89,0.22)]"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/dashboard/profile"
                                    className="bg-[var(--surface)] text-[var(--fg)] px-6 py-2.5 rounded-full font-semibold text-sm hover:scale-[1.04] active:scale-[0.96] transition-all duration-200 border border-[var(--border)]"
                                >
                                    Profile
                                </Link>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-[#ff7759] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:scale-[1.04] hover:brightness-110 active:scale-[0.96] transition-all duration-200 shadow-[0_4px_14px_rgba(255,119,89,0.22)]"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Mobile Hamburger Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 text-[var(--fg)] hover:bg-[var(--overlay)] rounded-full transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                {/* Hero Content Area — fully centered */}
                <main className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 flex-1 flex flex-col justify-center py-12">
                    <div className="max-w-[720px] mx-auto flex flex-col items-center text-center">
                        {/* Heading */}
                        <h1 className="font-heading text-[clamp(1.9rem,6vw,3.4rem)] leading-[1.05] tracking-[-0.01em] text-[var(--fg)] mb-6 font-bold gsap-hero-animate">
                            <Zap className="inline-block w-6 h-6 sm:w-8 sm:h-8 text-[var(--fg)] align-middle relative -top-[2px] mr-2" />
                            Single sign-on,
                            <LockKeyhole className="inline-block w-6 h-6 sm:w-8 sm:h-8 text-[var(--fg)] align-middle relative -top-[2px] mx-2" />
                            in two steps
                            <Fingerprint className="inline-block w-6 h-6 sm:w-8 sm:h-8 text-[var(--fg)] align-middle relative -top-[2px] ml-2" />
                        </h1>

                        {/* Subtext */}
                        <p className="font-body text-[clamp(0.95rem,2.5vw,1.15rem)] leading-[1.65] text-[var(--fg)] opacity-80 mb-9 max-w-[600px] mx-auto gsap-hero-animate">
                            Open OAuth 2.0 single sign-on —{" "}
                            <strong className="font-semibold opacity-100">
                                not just for Elixpo
                            </strong>
                            . Add “Sign in with Elixpo” to any app, yours or
                            ours, in two steps: register your app, then drop in
                            the button. One account, signed in everywhere.
                        </p>

                        {/* CTAs — Dashboard + Docs */}
                        <div className="gsap-hero-animate flex flex-wrap items-center justify-center gap-3">
                            <motion.div
                                whileHover={{
                                    scale: 1.04,
                                    filter: "brightness(1.1)",
                                }}
                                whileTap={{ scale: 0.96 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Link
                                    href={authed ? "/dashboard" : "/login"}
                                    className="bg-[#ff7759] text-white rounded-full py-[15px] px-7 font-body font-semibold text-[clamp(0.9rem,2vw,1rem)] shadow-[0_6px_24px_rgba(255,119,89,0.32)] flex items-center gap-2.5 group"
                                >
                                    <span>
                                        {authed
                                            ? "Go to Dashboard"
                                            : "Dashboard"}
                                    </span>
                                    <ArrowRightCircle className="w-5 h-5 text-white transition-transform group-hover:translate-x-1" />
                                </Link>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Link
                                    href="/docs"
                                    className="bg-[var(--surface)]/85 backdrop-blur-sm text-[var(--fg)] rounded-full py-[15px] px-7 font-body font-semibold text-[clamp(0.9rem,2vw,1rem)] border border-[var(--border)] flex items-center gap-2.5"
                                >
                                    Docs
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </main>

                {/* Arrow to scroll down */}
                <button
                    type="button"
                    aria-label="Scroll to features"
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 opacity-60 text-xs font-semibold tracking-widest text-[var(--fg)] cursor-pointer animate-bounce select-none border-0 bg-transparent p-0"
                    onClick={() =>
                        document
                            .getElementById("features")
                            ?.scrollIntoView({ behavior: "smooth" })
                    }
                >
                    <span>FEATURES</span>
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                    </svg>
                </button>
            </section>

            {/* TWO STEPS SECTION */}
            <section className="bg-[var(--bg)] text-[var(--fg)] py-24 relative z-10">
                <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-[720px] mx-auto mb-16">
                        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff7759] mb-4">
                            Get started
                        </span>
                        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                            Add Sign in with Elixpo in two steps
                        </h2>
                        <p className="text-base sm:text-lg opacity-80 leading-relaxed font-body">
                            No SDK to wrestle with. Create your account,
                            register your app, and you&apos;re issuing logins —
                            for Elixpo apps or your own.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-[940px] mx-auto">
                        {/* Step 1 — account */}
                        <div className="relative bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-8 flex flex-col gsap-card-animate">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="font-heading text-sm font-bold w-9 h-9 grid place-items-center rounded-full bg-[#ff7759] text-white">
                                    01
                                </span>
                                <div className="p-2.5 bg-[#ff7759]/10 border border-[#ff7759]/25 rounded-xl text-[#ff7759]">
                                    <Fingerprint className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="font-heading text-xl font-bold mb-2">
                                Create your account
                            </h3>
                            <p className="text-[var(--fg-muted)] leading-relaxed text-sm sm:text-base font-body mb-6">
                                Register a free Elixpo account — or sign in if
                                you already have one. One identity that works
                                everywhere.
                            </p>
                            <div className="mt-auto flex flex-wrap items-center gap-3">
                                <Link
                                    href="/register"
                                    className="inline-flex items-center gap-2 bg-[#ff7759] text-white px-5 py-2.5 rounded-full font-body font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                                >
                                    Create account
                                    <ArrowRightCircle className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center text-sm font-semibold text-[var(--fg)] opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    Sign in
                                </Link>
                            </div>
                        </div>

                        {/* Step 2 — register the app */}
                        <div className="relative bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-8 flex flex-col gsap-card-animate">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="font-heading text-sm font-bold w-9 h-9 grid place-items-center rounded-full bg-[#ff7759] text-white">
                                    02
                                </span>
                                <div className="p-2.5 bg-[#ff7759]/10 border border-[#ff7759]/25 rounded-xl text-[#ff7759]">
                                    <Network className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="font-heading text-xl font-bold mb-2">
                                Register your app
                            </h3>
                            <p className="text-[var(--fg-muted)] leading-relaxed text-sm sm:text-base font-body mb-6">
                                Add your app in the dashboard to get OAuth
                                client credentials, then drop in the “Sign in
                                with Elixpo” button. That&apos;s it.
                            </p>
                            <div className="mt-auto flex flex-wrap items-center gap-3">
                                <Link
                                    href="/dashboard/oauth-apps"
                                    className="inline-flex items-center gap-2 bg-[#ff7759] text-white px-5 py-2.5 rounded-full font-body font-semibold text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                                >
                                    Register an app
                                    <ArrowRightCircle className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/docs/quickstart"
                                    className="inline-flex items-center text-sm font-semibold text-[var(--fg)] opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    Read the quickstart
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES LIST SECTION */}
            <section
                id="features"
                className="bg-[var(--bg)] text-[var(--fg)] py-28 border-t border-[var(--border)] relative z-10"
            >
                <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-[700px] mx-auto mb-20">
                        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                            What can you do with Elixpo Accounts?
                        </h2>
                        <p className="text-base sm:text-lg opacity-80 leading-relaxed font-body">
                            Our open OAuth 2.0 gateway coordinates identity,
                            billing, and webhooks on the edge.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        {FEATURES.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.title}
                                    className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(25,40,55,0.015)] transition-all hover:shadow-[0_12px_32px_rgba(255, 119, 89,0.05)] hover:border-[#ff7759]/30 flex flex-col justify-between gsap-card-animate"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="p-3 bg-[#ff7759]/10 border border-[#ff7759]/25 rounded-xl text-[#ff7759]">
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            {feature.soon && (
                                                <span className="bg-[var(--overlay)] text-[var(--fg-muted)] border border-[var(--border)] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
                                                    Coming soon
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-heading text-xl font-bold mb-3">
                                            {feature.title}
                                        </h3>
                                        <p className="text-[var(--fg-muted)] leading-relaxed text-sm sm:text-base font-body">
                                            {feature.body}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* READY WHEN YOU ARE SECTION */}
            <section className="bg-[var(--bg)] text-[var(--fg)] py-24 border-t border-[var(--border)] relative z-10">
                <div className="max-w-[800px] mx-auto px-5 text-center">
                    <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
                        Ready when you are.
                    </h2>
                    <p className="text-base opacity-80 mb-8 max-w-[560px] mx-auto font-body leading-relaxed">
                        Create an account in seconds or sign in if you already
                        have one. The same identity works across Elixpo and any
                        app integrating our SSO.
                    </p>
                    <motion.div
                        whileHover={{ scale: 1.04, filter: "brightness(1.1)" }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="inline-block"
                    >
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-3 bg-[#ff7759] text-white px-8 py-4 rounded-full font-body font-semibold transition-all shadow-[0_4px_24px_rgba(255, 119, 89,0.28)]"
                        >
                            <span>Continue to sign in</span>
                            <ArrowRightCircle className="w-5 h-5 text-white" />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* FOOTER */}
            <Footer />

            {/* MOBILE MENU SHEET */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-[#192837]/35 backdrop-blur-[4px] z-50 pointer-events-auto"
                        />
                        {/* Drawer Sheet */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{
                                ease: [0.22, 1, 0.36, 1] as const,
                                duration: 0.45,
                            }}
                            className="fixed right-0 top-0 w-[min(88vw,360px)] h-[100dvh] bg-[var(--surface)] shadow-[-12px_0_48px_rgba(25,40,55,0.18)] z-50 flex flex-col p-6 text-[var(--fg)]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                                <Link
                                    href="/"
                                    className="flex items-center gap-2"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <img
                                        src="/LOGO/logo.png"
                                        alt="Elixpo Mascot"
                                        className="w-8 h-8 rounded-lg object-contain bg-white/80 p-0.5"
                                    />
                                    <span className="font-heading text-lg font-bold text-[var(--fg)]">
                                        Elixpo
                                    </span>
                                </Link>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-1 hover:bg-[var(--overlay)] rounded-full transition-colors text-[var(--fg)]"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Staggered Navigation Links */}
                            <div className="flex-1 flex flex-col gap-6 py-8">
                                {(authed ? APP_LINKS : MARKETING_LINKS).map(
                                    (link, i) => (
                                        <motion.div
                                            key={link.label}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                delay: 0.18 + i * 0.07,
                                                ease: [
                                                    0.22, 1, 0.36, 1,
                                                ] as const,
                                                duration: 0.45,
                                            }}
                                        >
                                            <Link
                                                href={link.href}
                                                onClick={() =>
                                                    setIsMobileMenuOpen(false)
                                                }
                                                className="text-lg font-semibold hover:opacity-70 transition-opacity"
                                            >
                                                {link.label}
                                            </Link>
                                        </motion.div>
                                    ),
                                )}
                            </div>

                            {/* Bottom Call to Actions */}
                            <div className="border-t border-[var(--border)] pt-6 flex flex-col gap-3">
                                {authed === null ? null : authed ? (
                                    <>
                                        <Link
                                            href="/dashboard/oauth-apps"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                            className="w-full bg-[#ff7759] text-white py-3 rounded-full font-semibold text-center hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
                                        >
                                            Go to Dashboard
                                        </Link>
                                        <Link
                                            href="/dashboard/profile"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                            className="w-full bg-[var(--surface-2)] text-[var(--fg)] py-3 rounded-full font-semibold text-center hover:brightness-110 active:scale-[0.98] transition-all border border-[var(--border)]"
                                        >
                                            Profile
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                            className="w-full bg-[#ff7759] text-white py-3 rounded-full font-semibold text-center hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
                                        >
                                            Start For Free
                                        </Link>
                                        <Link
                                            href="/login"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                            className="w-full bg-[var(--surface-2)] text-[var(--fg)] py-3 rounded-full font-semibold text-center hover:brightness-110 active:scale-[0.98] transition-all border border-[var(--border)]"
                                        >
                                            Sign In
                                        </Link>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
