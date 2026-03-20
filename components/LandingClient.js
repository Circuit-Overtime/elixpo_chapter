"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

function FloatingPaperPiece({ delay, x, y, size, rotation }) {
  return (
    <motion.div
      className="absolute rounded-sm bg-[#E2D9C8] opacity-[0.04]"
      style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, rotate: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 0.06, 0.03, 0.06, 0],
        rotate: [rotation, rotation + 20, rotation - 10, rotation + 15],
        scale: [0.5, 1, 0.8, 1],
        y: [0, -30, 10, -20],
      }}
      transition={{
        duration: 12,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function InkSplatter({ delay, x, y }) {
  return (
    <motion.div
      className="absolute rounded-full bg-[#E2D9C8]"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 0.08, 0.04], scale: [0, 1.5, 1] }}
      transition={{ duration: 3, delay, repeat: Infinity, repeatDelay: 8 }}
    >
      <div className="w-3 h-3 rounded-full" />
    </motion.div>
  );
}

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
      className="mt-2 flex items-center gap-2 px-2 py-1 rounded-md bg-[#1B1B19]/10 hover:bg-[#1B1B19] hover:text-[#E2D9C8] transition-all duration-300 text-[#777] text-[0.7em] tracking-[1px] cursor-pointer"
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

const paperPieces = [
  { delay: 0, x: 10, y: 15, size: 60, rotation: 15 },
  { delay: 2, x: 80, y: 10, size: 40, rotation: -25 },
  { delay: 4, x: 25, y: 70, size: 50, rotation: 45 },
  { delay: 1, x: 70, y: 65, size: 35, rotation: -10 },
  { delay: 3, x: 50, y: 30, size: 45, rotation: 30 },
  { delay: 5, x: 90, y: 80, size: 55, rotation: -40 },
  { delay: 1.5, x: 5, y: 50, size: 30, rotation: 20 },
  { delay: 3.5, x: 60, y: 85, size: 40, rotation: -15 },
];

const inkSplatters = [
  { delay: 1, x: 15, y: 25 },
  { delay: 4, x: 85, y: 45 },
  { delay: 7, x: 45, y: 75 },
  { delay: 2, x: 75, y: 15 },
  { delay: 5, x: 30, y: 55 },
];

export default function LandingClient({ profiles }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative h-[100dvh] bg-[#1B1B19] flex flex-col items-center justify-center overflow-hidden">
      {/* Paper texture background */}
      <div className="absolute inset-0 opacity-[0.07] bg-[url(/assets/ayushman/paperTexture.jpg)] bg-repeat bg-contain pointer-events-none" />

      {/* Floating paper pieces */}
      {mounted &&
        paperPieces.map((p, i) => <FloatingPaperPiece key={i} {...p} />)}

      {/* Ink splatters */}
      {mounted && inkSplatters.map((s, i) => <InkSplatter key={i} {...s} />)}

      {/* Decorative horizontal lines */}
      <motion.div
        className="absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#444] to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
      />
      <motion.div
        className="absolute bottom-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#444] to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, delay: 0.8 }}
      />

      {/* Corner ornaments */}
      <motion.div
        className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-[#444] rounded-tl-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      />
      <motion.div
        className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-[#444] rounded-tr-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      />
      <motion.div
        className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-[#444] rounded-bl-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      />
      <motion.div
        className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-[#444] rounded-br-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      />

      {/* Header */}
      <motion.div
        className="relative z-10 text-center mb-[2vh] sm:mb-[3vh]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <motion.h1
          className="text-[#E2D9C8] text-[clamp(2rem,8vw,10rem)] leading-none select-none"
          style={{ fontFamily: "Canopee, serif" }}
          initial={{ letterSpacing: "0.5em", opacity: 0 }}
          animate={{ letterSpacing: "0.15em", opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        >
          ELIXPO
        </motion.h1>

        {/* Decorative line under title */}
        <motion.div
          className="mx-auto mt-2 h-[2px] bg-gradient-to-r from-transparent via-[#ffc300] to-transparent"
          initial={{ width: 0 }}
          animate={{ width: "80%" }}
          transition={{ duration: 1.5, delay: 0.8 }}
        />

        <motion.p
          className="text-[#999] text-xs sm:text-sm md:text-base mt-2 tracking-[3px] sm:tracking-[5px] max-w-[700px] mx-auto px-4"
          style={{ fontFamily: "'Pathway Gothic One', sans-serif" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          Personalized Portfolio of Members of the Elixpo Organisation
        </motion.p>
      </motion.div>

      {/* Person Cards — horizontal scroll when many */}
      <div className="relative z-10 flex flex-row gap-3 sm:gap-8 md:gap-12 px-2 sm:px-8 overflow-x-auto overflow-y-hidden max-w-full scrollbar-hide">
        {profiles.map((profile, index) => (
          <motion.div
            key={profile.slug}
            className="flex-shrink-0"
            initial={{ opacity: 0, y: 60, rotateY: -10 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 1.5 + index * 0.3, ease: "easeOut" }}
          >
            <Link
              href={`/${profile.slug}`}
              className="group relative flex flex-col h-[clamp(260px,55vh,420px)] aspect-[3/4] border-2 border-[#444] rounded-[20px] bg-[#E2D9C8] p-4 sm:p-5 transition-all duration-500 hover:scale-105 hover:border-[#ffc300] hover:shadow-[0_0_60px_rgba(255,195,0,0.12)]"
            >
              {/* Paper grain overlay on card */}
              <div className="absolute inset-0 rounded-[20px] opacity-30 bg-[url(/assets/ayushman/paperTexture.jpg)] bg-repeat bg-cover pointer-events-none mix-blend-multiply" />

              {/* Portrait */}
              <div
                className="relative w-full flex-1 rounded-[12px] bg-cover bg-center border-2 border-[#222] sepia-[40%] saturate-[180%] group-hover:sepia-0 group-hover:saturate-100 transition-all duration-500"
                style={{
                  backgroundImage: `url(/assets/${profile.slug}/about/ptr-11.png)`,
                }}
              />

              {/* Name */}
              <div className="relative mt-3">
                <h2
                  className="text-[#1B1B19] text-2xl sm:text-3xl md:text-4xl tracking-wide"
                  style={{ fontFamily: "Canopee, serif" }}
                >
                  {profile.siteName}
                </h2>
                <p className="text-[#888] text-[0.65rem] sm:text-xs mt-1 sm:mt-2 tracking-[1px] line-clamp-2">
                  {profile.siteDescription}
                </p>
                <EmailCopy email={profile.email} />
              </div>

              {/* Arrow circle */}
              <div className="absolute bottom-4 right-4 w-[36px] h-[36px] sm:w-[44px] sm:h-[44px] border-2 border-dashed border-[#222] rounded-full flex items-center justify-center group-hover:bg-[#1B1B19] group-hover:border-solid group-hover:rotate-[360deg] transition-all duration-700">
                <span className="text-[#222] text-lg sm:text-xl group-hover:text-[#E2D9C8] transition-colors duration-300">
                  &rarr;
                </span>
              </div>

              {/* Stamp decoration */}
              <div className="absolute top-4 right-4 w-[28px] h-[28px] sm:w-[36px] sm:h-[36px] rounded-full border border-dashed border-[#999] opacity-40 group-hover:opacity-70 transition-opacity duration-300" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
