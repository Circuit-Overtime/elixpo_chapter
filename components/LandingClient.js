"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PixelBloomCanvas from "@/components/PixelBloomCanvas";

const LAST_PROFILE_KEY = "elixpo:last-visited-profile";

function EmailCopy({ email }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(email).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = email;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="pointer-events-auto relative z-30 flex max-w-[66%] min-w-0 items-center gap-2 py-1 text-[0.65rem] tracking-[1px] text-[#d0c6b4] transition-colors hover:text-[#e06436]"
      style={{ fontFamily: "'Pathway Gothic One', sans-serif" }}
    >
      <span className="truncate">{copied ? "Copied!" : email}</span>
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );
}

function SideProfileCard({ profile, side, locked, progress, onLeave, onWheel, onOpen }) {
  const isLeft = side === "left";

  return (
    <motion.button
      type="button"
      onMouseLeave={onLeave}
      onWheel={(event) => onWheel(event, profile)}
      onClick={() => onOpen(profile)}
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.035 }}
      className={`vintage-card-small group relative aspect-[4/5] w-[clamp(8rem,12vw,11rem)] overflow-hidden border bg-[#211f1a] text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#B63B12] ${locked ? "border-[#B63B12]" : "border-[#625c4f] hover:border-[#9b8e77]"}`}
      aria-label={`Open ${profile.siteName}'s portfolio`}
    >
      <PixelBloomCanvas src={`/assets/${profile.slug}/about/ptr-11.webp`} className="absolute inset-0" />
      <span className="absolute inset-0 bg-gradient-to-t from-[#11100d] via-transparent to-[#11100d]/15" />
      <span className="absolute inset-x-3 bottom-3 z-10">
        <span className="block truncate text-2xl leading-none text-[#f1e7d7]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
          {profile.siteName}
        </span>
        <span className="mt-1 block text-[0.55rem] uppercase tracking-[2px] text-[#b9ae9b]">
          {locked ? "Scroll to focus" : `Member ${String(profile.portfolioIndex + 1).padStart(2, "0")}`}
        </span>
      </span>
      {locked && (
        <span className="absolute inset-x-0 bottom-0 z-20 h-1 bg-[#34291f]">
          <span className="block h-full bg-[#B63B12]" style={{ width: `${progress * 100}%` }} />
        </span>
      )}
    </motion.button>
  );
}

function MobileProfileNode({ profile, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(profile.slug)}
      className="flex shrink-0 flex-col items-center gap-1.5 outline-none focus-visible:text-[#e06436]"
      aria-label={`Select ${profile.siteName}`}
    >
      <span className="relative h-14 w-14 overflow-hidden rounded-full border border-[#625c4f] bg-[#211f1a]">
        <PixelBloomCanvas src={`/assets/${profile.slug}/about/ptr-11.webp`} className="absolute inset-0" />
      </span>
      <span className="max-w-16 truncate text-xs text-[#b9ae9b]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
        {profile.siteName}
      </span>
    </button>
  );
}

export default function LandingClient({ profiles }) {
  const defaultSlug = profiles.find((profile) => profile.slug === "ayushman")?.slug ?? profiles[0]?.slug ?? "";
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(defaultSlug);
  const [lockedSlug, setLockedSlug] = useState(null);
  const [manualOpenProgress, setManualOpenProgress] = useState(0);
  const sceneRef = useRef(null);
  const navigatingRef = useRef(false);

  const orderedProfiles = useMemo(
    () => profiles.map((profile, portfolioIndex) => ({ ...profile, portfolioIndex })),
    [profiles]
  );
  const filteredProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return orderedProfiles;

    return orderedProfiles.filter((profile) =>
      [profile.siteName, profile.siteDescription, profile.location]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [orderedProfiles, query]);

  const selectedProfile = filteredProfiles.find((profile) => profile.slug === selectedSlug) ?? filteredProfiles[0];
  const sideProfiles = filteredProfiles;
  const leftProfiles = sideProfiles.filter((_, index) => index % 2 === 0);
  const rightProfiles = sideProfiles.filter((_, index) => index % 2 === 1);

  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ["start start", "end end"] });
  const centerScale = useTransform(scrollYProgress, [0, 0.72, 1], [0.88, 1, 1.38]);
  const centerY = useTransform(scrollYProgress, [0, 0.72, 1], [30, 0, 0]);
  const sideOpacity = useTransform(scrollYProgress, [0, 0.72, 0.94], [0.55, 1, 0]);
  const orbitScale = useTransform(scrollYProgress, [0, 0.8, 1], [0.82, 1, 1.55]);

  const openProfile = useCallback((profile) => {
    if (!profile || navigatingRef.current) return;
    navigatingRef.current = true;
    window.localStorage.setItem(LAST_PROFILE_KEY, profile.slug);
    window.location.assign(`/${profile.slug}`);
  }, []);

  useEffect(() => {
    const rememberedSlug = window.localStorage.getItem(LAST_PROFILE_KEY);
    if (rememberedSlug && profiles.some((profile) => profile.slug === rememberedSlug)) {
      setSelectedSlug(rememberedSlug);
    }
  }, [profiles]);

  useEffect(() => {
    if (query.trim() && filteredProfiles[0]) {
      setSelectedSlug(filteredProfiles[0].slug);
      setManualOpenProgress(0);
    }
  }, [filteredProfiles, query]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (progress >= 0.985 && selectedProfile) openProfile(selectedProfile);
  });

  const focusWithWheel = (event, profile) => {
    if (event.deltaY <= 0) {
      setManualOpenProgress((current) => Math.max(0, current - Math.abs(event.deltaY) / 700));
      return;
    }

    event.preventDefault();
    if (lockedSlug !== profile.slug) {
      setLockedSlug(profile.slug);
      setSelectedSlug(profile.slug);
      setManualOpenProgress(0.16);
      return;
    }

    setManualOpenProgress((current) => {
      const next = Math.min(1, current + event.deltaY / 650);
      if (next >= 1) openProfile(profile);
      return next;
    });
  };

  const releaseWheel = () => {
    setLockedSlug(null);
    setManualOpenProgress(0);
  };

  const selectProfile = (slug) => {
    setSelectedSlug(slug);
    setManualOpenProgress(0);
  };

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#151512] text-[#E2D9C8]">
      <div className="fixed inset-0 z-0">
        <PixelBloomCanvas mode="background" className="absolute inset-0 opacity-50" />
        <div className="absolute inset-0 bg-[#151512]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#151512_78%)]" />
      </div>

      <section className="relative z-10 flex min-h-[62svh] flex-col">
        <motion.div className="flex items-center justify-between px-5 pt-5 text-[0.6rem] uppercase tracking-[3px] text-[#a59a84] sm:px-10 sm:pt-7 sm:text-xs" style={{ fontFamily: "'Pathway Gothic One', sans-serif" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span>The Elixpo Organisation</span>
          <span>Est. 2023</span>
          <span className="hidden sm:inline">Portfolio Series</span>
        </motion.div>
        <div className="mx-5 mt-3 h-px bg-[#5b5446]/70 sm:mx-10" />

        <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10 pt-8 text-center">
          <motion.p className="mb-2 text-[0.6rem] uppercase tracking-[0.45em] text-[#b6aa93] sm:text-xs" style={{ fontFamily: "'Bitcount Grid Double', system-ui" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            A living archive of builders
          </motion.p>
          <motion.h1 className="text-[clamp(4rem,9vw,8rem)] leading-[0.82] text-[#f0e6d5]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }} initial={{ opacity: 0, letterSpacing: "0.2em" }} animate={{ opacity: 1, letterSpacing: "0.04em" }} transition={{ duration: 1 }}>
            ELIXPO
          </motion.h1>
          <div className="mt-5 flex items-center gap-3 sm:gap-4">
            <span className="h-px w-10 bg-[#B63B12] sm:w-20" />
            <span className="text-[0.65rem] uppercase tracking-[4px] text-[#d55728] sm:text-sm" style={{ fontFamily: "'Pathway Gothic One', sans-serif" }}>Member Registry · Est. MMXXIII</span>
            <span className="h-px w-10 bg-[#B63B12] sm:w-20" />
          </div>
          <p className="mt-5 max-w-[640px] px-4 text-sm tracking-[1px] text-[#aaa08e] sm:text-base" style={{ fontFamily: "'Pathway Gothic One', sans-serif" }}>Personalized portfolios of the people building the Elixpo ecosystem.</p>
          <span className="mt-8 text-[0.55rem] uppercase tracking-[3px] text-[#847a68]">Scroll to enter the registry</span>
        </div>
      </section>

      <section ref={sceneRef} className="relative z-10 h-[230vh]">
        <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden bg-[#151512]/48 px-4 py-4 backdrop-blur-[2px] sm:px-8">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="shrink-0 text-[0.6rem] uppercase tracking-[4px] text-[#a59a84] sm:text-xs" aria-live="polite">{query ? `${filteredProfiles.length} matches` : `${profiles.length} member profiles`}</span>
              <span className="h-px flex-1 bg-[#4b483d]" />
            </div>
            <label className="group/search relative block w-full sm:w-72">
              <span className="sr-only">Search members</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c856f] group-focus-within/search:text-[#B63B12]"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" className="w-full rounded-full border border-[#4b483d] bg-[#1c1c18]/90 py-2.5 pl-11 pr-4 text-sm text-[#E2D9C8] outline-none placeholder:text-[#777] focus:border-[#B63B12]" style={{ fontFamily: "'Pathway Gothic One', sans-serif", letterSpacing: "1px" }} />
            </label>
          </div>

          {selectedProfile ? (
            <div className="mx-auto grid w-full max-w-[1450px] flex-1 grid-cols-1 items-center lg:grid-cols-[minmax(170px,1fr)_minmax(360px,1.2fr)_minmax(170px,1fr)] lg:gap-8">
              <motion.div style={{ opacity: sideOpacity }} className="hidden h-[68vh] flex-col items-end justify-around lg:flex">
                {leftProfiles.map((profile) => <SideProfileCard key={profile.slug} profile={profile} side="left" locked={lockedSlug === profile.slug} progress={lockedSlug === profile.slug ? manualOpenProgress : 0} onLeave={releaseWheel} onWheel={focusWithWheel} onOpen={openProfile} />)}
              </motion.div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center">
                <motion.div style={{ scale: orbitScale }} className="pointer-events-none absolute h-[min(76vw,33rem)] w-[min(76vw,33rem)] rounded-full border border-[#5f5748]/70"><span className="absolute left-1/2 top-[-4px] h-2 w-2 -translate-x-1/2 rounded-full bg-[#B63B12]" /><span className="absolute bottom-[-4px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-[#a59a84] bg-[#151512]" /></motion.div>
                <div className="pointer-events-none absolute h-[min(64vw,27rem)] w-[min(64vw,27rem)] rounded-full border border-dashed border-[#8c856f]/35" />

                <motion.article key={selectedProfile.slug} style={{ scale: centerScale, y: centerY }} onWheel={(event) => focusWithWheel(event, selectedProfile)} onMouseLeave={releaseWheel} className="vintage-card group relative z-10 aspect-square w-[min(72vw,24rem)] overflow-hidden border border-[#756e60] bg-[#211f1a] shadow-[0_28px_80px_rgba(0,0,0,0.5)]">
                  <Link href={`/${selectedProfile.slug}`} onClick={() => window.localStorage.setItem(LAST_PROFILE_KEY, selectedProfile.slug)} className="absolute inset-0 z-20"><span className="sr-only">Open {selectedProfile.siteName}&apos;s portfolio</span></Link>
                  <PixelBloomCanvas src={`/assets/${selectedProfile.slug}/about/ptr-11.webp`} className="absolute inset-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#11100d]/95 via-[#11100d]/20 to-[#11100d]/15" />
                  <div className="pointer-events-none absolute inset-3 border border-[#e2d9c8]/25" />
                  <div className="pointer-events-none absolute inset-x-7 top-6 z-20 flex items-center gap-3 text-[#f0e6d5]"><span className="h-px flex-1 bg-[#E2D9C8]/45" /><span className="text-[0.55rem] uppercase tracking-[3px]" style={{ fontFamily: "'Bitcount Grid Double', system-ui" }}>Member {String(selectedProfile.portfolioIndex + 1).padStart(2, "0")}</span><span className="h-px flex-1 bg-[#E2D9C8]/45" /></div>
                  <div className="pointer-events-none absolute inset-x-7 bottom-6 z-20 text-center">
                    <span className="mb-1 block text-xs text-[#df5b2d]">◆</span>
                    <h2 className="truncate text-4xl leading-none text-[#f2e9da] sm:text-5xl" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>{selectedProfile.siteName}</h2>
                    <p className="mt-2 line-clamp-2 min-h-[2.4em] text-[0.62rem] uppercase tracking-[1.7px] text-[#c9beab] sm:text-xs">{selectedProfile.siteDescription}</p>
                    <div className="mt-3 flex items-end justify-between gap-2 border-t border-[#E2D9C8]/30 pt-2"><EmailCopy email={selectedProfile.email} /><span className="text-[0.62rem] uppercase tracking-[1.5px] text-[#f0e6d5]">Scroll to open &darr;</span></div>
                  </div>
                  {manualOpenProgress > 0 && <div className="absolute inset-x-0 bottom-0 z-30 h-1.5 bg-[#2a211b]"><motion.div className="h-full bg-[#B63B12]" animate={{ width: `${manualOpenProgress * 100}%` }} /></div>}
                </motion.article>
              </div>

              <motion.div style={{ opacity: sideOpacity }} className="hidden h-[68vh] flex-col items-start justify-around lg:flex">
                {rightProfiles.map((profile) => <SideProfileCard key={profile.slug} profile={profile} side="right" locked={lockedSlug === profile.slug} progress={lockedSlug === profile.slug ? manualOpenProgress : 0} onLeave={releaseWheel} onWheel={focusWithWheel} onOpen={openProfile} />)}
              </motion.div>

              <div className="scrollbar-hide absolute inset-x-0 bottom-3 flex justify-center gap-4 overflow-x-auto px-4 pb-1 lg:hidden">
                {sideProfiles.map((profile) => <MobileProfileNode key={profile.slug} profile={profile} onSelect={selectProfile} />)}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center"><p className="text-3xl text-[#E2D9C8]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>No members found</p><p className="mt-2 text-sm tracking-[1px] text-[#777]">Try another name, role, or location.</p></div>
          )}
        </div>
      </section>
    </main>
  );
}
