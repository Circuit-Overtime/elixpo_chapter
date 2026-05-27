"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

function EmailCopy({ email }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(email).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-2 py-1 rounded-md bg-[#1B1B19]/10 hover:bg-[#1B1B19] hover:text-[#E2D9C8] transition-all duration-300 text-[#777] text-[0.7em] tracking-[1px] cursor-pointer"
      style={{ fontFamily: "'Pathway Gothic One', sans-serif" }}
    >
      <span>{copied ? "Copied!" : email}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );
}

const ACCENT = "#B63B12";

export default function LandingClient({ profiles }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-[100dvh] bg-[#1B1B19] flex flex-col overflow-x-hidden">
      {/* Paper grain */}
      <div className="absolute inset-0 opacity-[0.06] bg-[url(/assets/ayushman/paperTexture.webp)] bg-repeat bg-contain pointer-events-none" />

      {/* ===== Masthead dateline bar ===== */}
      <motion.div
        className="relative z-10 flex items-center justify-between px-5 sm:px-10 pt-5 sm:pt-7 text-[#8c856f] text-[0.6rem] sm:text-xs uppercase tracking-[3px]"
        style={{ fontFamily: "'Pathway Gothic One', sans-serif" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <span>The Elixpo Organisation</span>
        <span>Est. 2023</span>
        <span className="hidden sm:inline">Portfolio Series</span>
      </motion.div>
      <div className="relative z-10 mx-5 sm:mx-10 mt-3 h-0.5 bg-[#3a382f]" />

      {/* ===== Cover masthead ===== */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-8 sm:py-10">
        <motion.h1
          className="text-[#E2D9C8] text-[clamp(3rem,13vw,13rem)] leading-[0.85] text-center select-none"
          style={{ fontFamily: "Canopee, serif" }}
          initial={{ letterSpacing: "0.4em", opacity: 0 }}
          animate={{ letterSpacing: "0.12em", opacity: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        >
          ELIXPO
        </motion.h1>

        <motion.div
          className="flex items-center gap-3 sm:gap-4 mt-4 sm:mt-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <span className="h-0.5 w-10 sm:w-20" style={{ background: ACCENT }} />
          <span
            className="uppercase tracking-[4px] text-[0.65rem] sm:text-sm"
            style={{ color: ACCENT, fontFamily: "'Pathway Gothic One', sans-serif" }}
          >
            Vol. 04 · Portfolio Series
          </span>
          <span className="h-0.5 w-10 sm:w-20" style={{ background: ACCENT }} />
        </motion.div>

        <motion.p
          className="text-[#999] text-sm sm:text-base md:text-lg mt-5 sm:mt-7 tracking-[1px] max-w-[640px] text-center leading-relaxed px-4"
          style={{ fontFamily: "'Pathway Gothic One', sans-serif" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
        >
          Personalized portfolios of the people building the Elixpo ecosystem.
        </motion.p>
      </div>

      {/* ===== Contents / member index ===== */}
      <div className="relative z-10 px-5 sm:px-10 pb-8 sm:pb-12">
        <motion.div
          className="flex items-center gap-3 mb-5 sm:mb-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
        >
          <span
            className="uppercase tracking-[4px] text-[0.65rem] sm:text-sm text-[#8c856f]"
            style={{ fontFamily: "'Pathway Gothic One', sans-serif" }}
          >
            Contents — {profiles.length} Members
          </span>
          <span className="flex-1 h-0.5 bg-[#3a382f]" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 max-w-[1200px] mx-auto w-full">
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.slug}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.2 + index * 0.15, ease: "easeOut" }}
            >
              <Link
                href={`/${profile.slug}`}
                className="group relative flex flex-col h-full border-2 border-[#444] rounded-[18px] bg-[#E2D9C8] p-4 sm:p-5 transition-all duration-500 hover:border-[#B63B12] hover:-translate-y-1"
              >
                {/* Paper grain on card */}
                <div className="absolute inset-0 rounded-[18px] opacity-25 bg-[url(/assets/ayushman/paperTexture.webp)] bg-repeat bg-cover pointer-events-none mix-blend-multiply" />

                {/* Issue number */}
                <span
                  className="relative text-[#B63B12] text-sm sm:text-base tracking-[2px] mb-2"
                  style={{ fontFamily: "'Bitcount Grid Double', system-ui" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Portrait */}
                <div
                  className="relative w-full aspect-[4/5] rounded-[12px] bg-cover bg-center border-2 border-[#222] sepia-[40%] saturate-[160%] group-hover:sepia-0 group-hover:saturate-100 transition-all duration-500"
                  style={{ backgroundImage: `url(/assets/${profile.slug}/about/ptr-11.webp)` }}
                />

                {/* Name + role */}
                <div className="relative mt-3 flex flex-col">
                  <h2
                    className="text-[#1B1B19] text-2xl sm:text-3xl tracking-wide leading-none truncate uppercase"
                    style={{ fontFamily: "Canopee, serif" }}
                  >
                    {profile.siteName}
                  </h2>
                  <p className="text-[#888] text-[0.7rem] sm:text-xs mt-1 tracking-[1px] line-clamp-2 min-h-[2.4em]">
                    {profile.siteDescription}
                  </p>

                  {/* Bottom row */}
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <EmailCopy email={profile.email} />
                    <div className="shrink-0 w-9 h-9 sm:w-11 sm:h-11 border-2 border-dashed border-[#222] rounded-full flex items-center justify-center group-hover:bg-[#B63B12] group-hover:border-[#B63B12] group-hover:border-solid transition-all duration-500">
                      <span className="text-[#222] text-lg sm:text-xl group-hover:text-[#E2D9C8] group-hover:translate-x-0.5 transition-all duration-300">
                        &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
