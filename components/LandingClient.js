"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PixelBloomCanvas from "@/components/PixelBloomCanvas";

const LAST_PROFILE_KEY = "elixpo:last-visited-profile";
const COMING_SOON_PROFILES = [
  { slug: "coming-soon-01", siteName: "Coming Soon", siteDescription: "A new portfolio is being archived.", comingSoon: true },
  { slug: "coming-soon-02", siteName: "Coming Soon", siteDescription: "Reserved for a future Elixpo member.", comingSoon: true },
  { slug: "coming-soon-03", siteName: "Coming Soon", siteDescription: "The registry has room to grow.", comingSoon: true },
];
const SLOT_LAYOUTS = [
  "left-[5%] top-[7%] h-[24vh] w-[21vw]",
  "left-[2%] top-[39%] h-[38vh] w-[15vw]",
  "bottom-[4%] left-[20%] h-[20vh] w-[20vw]",
  "right-[7%] top-[8%] h-[23vh] w-[20vw]",
  "right-[2%] top-[39%] h-[38vh] w-[15vw]",
  "bottom-[4%] right-[20%] h-[20vh] w-[20vw]",
];

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

function CardPortrait({ slug, className = "" }) {
  const [hasGeneratedCover, setHasGeneratedCover] = useState(true);

  if (!hasGeneratedCover) {
    return <PixelBloomCanvas src={`/assets/${slug}/about/ptr-11.webp`} className={className} />;
  }

  return (
    <img
      src={`/assets/${slug}/about/card-cover.webp`}
      alt=""
      aria-hidden="true"
      onError={() => setHasGeneratedCover(false)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

function SideProfileCard({ profile, slotIndex, locked, progress, onLeave, onWheel, onOpen }) {
  return (
    <motion.button
      type="button"
      onMouseLeave={onLeave}
      onWheel={(event) => onWheel(event, profile, slotIndex)}
      onClick={() => !profile.comingSoon && onOpen(profile)}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.035 }}
      className={`vintage-card-small group relative h-full w-full overflow-hidden border bg-[#211f1a] text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#B63B12] ${locked ? "border-[#B63B12]" : "border-[#625c4f] hover:border-[#9b8e77]"} ${profile.comingSoon ? "cursor-default border-dashed opacity-75" : "cursor-pointer"}`}
      aria-label={profile.comingSoon ? "Portfolio coming soon" : `Open ${profile.siteName}'s portfolio`}
      aria-disabled={profile.comingSoon || undefined}
    >
      {profile.comingSoon
        ? <PixelBloomCanvas className="absolute inset-0" />
        : <CardPortrait slug={profile.slug} className="absolute inset-0" />}
      <span className="absolute inset-0 bg-gradient-to-t from-[#11100d] via-transparent to-[#11100d]/15" />
      {profile.comingSoon && <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-3xl text-[#B63B12]/80">✦</span>}
      <span className="absolute inset-x-3 bottom-3 z-10">
        <span className="block truncate text-2xl leading-none text-[#f1e7d7]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>
          {profile.siteName}
        </span>
        <span className="mt-1 block text-[0.55rem] uppercase tracking-[2px] text-[#b9ae9b]">
          {profile.comingSoon ? "Reserved archive slot" : locked ? "Locked · keep scrolling" : `Member ${String(profile.portfolioIndex + 1).padStart(2, "0")}`}
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
        <CardPortrait slug={profile.slug} className="absolute inset-0" />
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
  const [lockedSlotIndex, setLockedSlotIndex] = useState(null);
  const [manualOpenProgress, setManualOpenProgress] = useState(0);
  const [sideSlotIds, setSideSlotIds] = useState(() => {
    const memberIds = profiles.filter((profile) => profile.slug !== defaultSlug).map((profile) => profile.slug);
    return [...memberIds, ...COMING_SOON_PROFILES.map((profile) => profile.slug)].slice(0, 6);
  });
  const sceneRef = useRef(null);
  const navigatingRef = useRef(false);

  const orderedProfiles = useMemo(
    () => profiles.map((profile, portfolioIndex) => ({ ...profile, portfolioIndex })),
    [profiles]
  );
  const searchMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return orderedProfiles;

    return orderedProfiles.filter((profile) =>
      [profile.siteName, profile.siteDescription, profile.location]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [orderedProfiles, query]);

  const selectedProfile = orderedProfiles.find((profile) => profile.slug === selectedSlug) ?? orderedProfiles[0];
  const registryItems = useMemo(
    () => new Map([...orderedProfiles, ...COMING_SOON_PROFILES].map((profile) => [profile.slug, profile])),
    [orderedProfiles]
  );
  const sideProfiles = sideSlotIds.map((slug) => registryItems.get(slug)).filter(Boolean);
  const reservedCount = sideProfiles.filter((profile) => profile.comingSoon).length;

  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ["start start", "end end"] });
  const centerScale = useTransform(scrollYProgress, [0, 0.72, 1], [0.88, 1, 1.38]);
  const centerY = useTransform(scrollYProgress, [0, 0.72, 1], [30, 0, 0]);
  const sideOpacity = useTransform(scrollYProgress, [0, 0.72, 0.94], [0.55, 1, 0]);
  const orbitScale = useTransform(scrollYProgress, [0, 0.8, 1], [0.82, 1, 1.55]);
  const slotScale1 = useTransform(scrollYProgress, [0, 0.78, 1], [0.72, 1, 4]);
  const slotScale2 = useTransform(scrollYProgress, [0, 0.78, 1], [0.68, 1, 5]);
  const slotScale3 = useTransform(scrollYProgress, [0, 0.78, 1], [0.76, 1, 6]);
  const slotScale4 = useTransform(scrollYProgress, [0, 0.78, 1], [0.7, 1, 5]);
  const slotScale5 = useTransform(scrollYProgress, [0, 0.78, 1], [0.66, 1, 6]);
  const slotScale6 = useTransform(scrollYProgress, [0, 0.78, 1], [0.74, 1, 8]);
  const slotScales = [slotScale1, slotScale2, slotScale3, slotScale4, slotScale5, slotScale6];

  const openProfile = useCallback((profile) => {
    if (!profile || navigatingRef.current) return;
    navigatingRef.current = true;
    window.localStorage.setItem(LAST_PROFILE_KEY, profile.slug);
    window.location.assign(`/${profile.slug}`);
  }, []);

  useEffect(() => {
    const rememberedSlug = window.localStorage.getItem(LAST_PROFILE_KEY);
    if (rememberedSlug && profiles.some((profile) => profile.slug === rememberedSlug)) {
      setSideSlotIds((current) => current.map((slug) => slug === rememberedSlug ? defaultSlug : slug));
      setSelectedSlug(rememberedSlug);
    }
  }, [defaultSlug, profiles]);

  useEffect(() => {
    const match = searchMatches[0];
    if (query.trim() && match && match.slug !== selectedSlug) {
      setSideSlotIds((current) => current.map((slug) => slug === match.slug ? selectedSlug : slug));
      setSelectedSlug(match.slug);
      setManualOpenProgress(0);
    }
  }, [query, searchMatches, selectedSlug]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (progress >= 0.985 && selectedProfile) openProfile(selectedProfile);
  });

  const focusWithWheel = (event, profile, slotIndex = null) => {
    if (profile.comingSoon) return;
    if (event.deltaY <= 0) {
      setManualOpenProgress((current) => Math.max(0, current - Math.abs(event.deltaY) / 700));
      return;
    }

    event.preventDefault();
    if (slotIndex !== null && lockedSlotIndex !== slotIndex) {
      const previousCenterSlug = selectedProfile.slug;
      setSideSlotIds((current) => current.map((slug, index) => index === slotIndex ? previousCenterSlug : slug));
      setLockedSlotIndex(slotIndex);
      setLockedSlug(profile.slug);
      setSelectedSlug(profile.slug);
      setManualOpenProgress(0.16);
      return;
    }

    if (slotIndex === null && lockedSlug !== profile.slug) {
      setLockedSlug(profile.slug);
      setManualOpenProgress(0.16);
      return;
    }

    setManualOpenProgress((current) => {
      const next = Math.min(1, current + event.deltaY / 650);
      if (next >= 1) openProfile(selectedProfile);
      return next;
    });
  };

  const releaseWheel = () => {
    setLockedSlug(null);
    setLockedSlotIndex(null);
    setManualOpenProgress(0);
  };

  const selectProfile = (slug) => {
    const previousCenterSlug = selectedProfile.slug;
    setSideSlotIds((current) => current.map((slotSlug) => slotSlug === slug ? previousCenterSlug : slotSlug));
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
              <span className="shrink-0 text-[0.6rem] uppercase tracking-[4px] text-[#a59a84] sm:text-xs" aria-live="polite">{query ? `${searchMatches.length} matches` : `${profiles.length} member profiles · ${reservedCount} reserved`}</span>
              <span className="h-px flex-1 bg-[#4b483d]" />
            </div>
            <label className="group/search relative block w-full sm:w-72">
              <span className="sr-only">Search members</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c856f] group-focus-within/search:text-[#B63B12]"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" className="w-full rounded-full border border-[#4b483d] bg-[#1c1c18]/90 py-2.5 pl-11 pr-4 text-sm text-[#E2D9C8] outline-none placeholder:text-[#777] focus:border-[#B63B12]" style={{ fontFamily: "'Pathway Gothic One', sans-serif", letterSpacing: "1px" }} />
            </label>
          </div>

          <div className="relative mx-auto w-full max-w-[1500px] flex-1">
            {sideProfiles.map((profile, slotIndex) => (
              <motion.div
                key={`slot-${slotIndex}`}
                style={{ scale: slotScales[slotIndex], opacity: sideOpacity }}
                className={`absolute z-10 hidden lg:block ${SLOT_LAYOUTS[slotIndex]}`}
              >
                <SideProfileCard
                  profile={profile}
                  slotIndex={slotIndex}
                  locked={lockedSlotIndex === slotIndex}
                  progress={lockedSlotIndex === slotIndex ? manualOpenProgress : 0}
                  onLeave={releaseWheel}
                  onWheel={focusWithWheel}
                  onOpen={openProfile}
                />
              </motion.div>
            ))}

            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div style={{ scale: orbitScale }} className="pointer-events-none absolute h-[min(76vw,33rem)] w-[min(76vw,33rem)] rounded-full border border-[#5f5748]/70">
                <span className="absolute left-1/2 top-[-4px] h-2 w-2 -translate-x-1/2 rounded-full bg-[#B63B12]" />
                <span className="absolute bottom-[-4px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-[#a59a84] bg-[#151512]" />
              </motion.div>
              <div className="pointer-events-none absolute h-[min(64vw,27rem)] w-[min(64vw,27rem)] rounded-full border border-dashed border-[#8c856f]/35" />

              <motion.article key={selectedProfile.slug} style={{ scale: centerScale, y: centerY }} onWheel={(event) => focusWithWheel(event, selectedProfile)} onMouseLeave={releaseWheel} className="vintage-card group relative z-20 aspect-square w-[min(72vw,24rem)] overflow-hidden border border-[#756e60] bg-[#211f1a] shadow-[0_28px_80px_rgba(0,0,0,0.5)]">
                <Link href={`/${selectedProfile.slug}`} onClick={() => window.localStorage.setItem(LAST_PROFILE_KEY, selectedProfile.slug)} className="absolute inset-0 z-20"><span className="sr-only">Open {selectedProfile.siteName}&apos;s portfolio</span></Link>
                <CardPortrait slug={selectedProfile.slug} className="absolute inset-0" />
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

            <div className="scrollbar-hide absolute inset-x-0 bottom-3 z-30 flex justify-center gap-4 overflow-x-auto px-4 pb-1 lg:hidden">
              {sideProfiles.filter((profile) => !profile.comingSoon).map((profile) => <MobileProfileNode key={profile.slug} profile={profile} onSelect={selectProfile} />)}
            </div>

            {query && searchMatches.length === 0 && (
              <div className="absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-full border border-[#6b4434] bg-[#1c1c18]/95 px-4 py-2 text-xs tracking-[1px] text-[#d9b19b]">No matching member — showing the current profile</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
