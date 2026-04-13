"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 md:px-10 py-3 backdrop-blur-xl bg-white/80 border-b border-neutral-100"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/images/logo.png" alt="Elixpo" width={36} height={36} className="rounded-lg" />
        <span className="font-[family-name:var(--font-parkinsans)] font-bold text-lg text-neutral-900">
          Elixpo Chat
        </span>
      </Link>

      {/* Desktop nav — all right-aligned */}
      <div className="hidden md:flex items-center gap-1">
        <NavLink href="/news">News</NavLink>
        <NavLink href="/podcast">Podcast</NavLink>
        <NavLink href="/discover">Discover</NavLink>
        <NavLink href="/chat/new">Chat</NavLink>

        <div className="w-px h-5 bg-neutral-200 mx-3" />

        <Link
          href="/chat/new"
          className="px-5 py-2 rounded-full text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
        >
          Sign in
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden flex flex-col gap-1.5 p-2"
        aria-label="Toggle menu"
      >
        <span className={`w-5 h-0.5 bg-neutral-900 transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`w-5 h-0.5 bg-neutral-900 transition-all ${mobileOpen ? "opacity-0" : ""}`} />
        <span className={`w-5 h-0.5 bg-neutral-900 transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 w-full bg-white border-b border-neutral-200 shadow-lg md:hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              <MobileLink href="/news" onClick={() => setMobileOpen(false)}>News</MobileLink>
              <MobileLink href="/podcast" onClick={() => setMobileOpen(false)}>Podcast</MobileLink>
              <MobileLink href="/discover" onClick={() => setMobileOpen(false)}>Discover</MobileLink>
              <MobileLink href="/chat/new" onClick={() => setMobileOpen(false)}>Chat</MobileLink>
              <Link
                href="/chat/new"
                onClick={() => setMobileOpen(false)}
                className="mt-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-neutral-900 text-white text-center"
              >
                Sign in
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-all"
    >
      {children}
    </Link>
  );
}

function MobileLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="text-base font-medium text-neutral-700 hover:text-neutral-900">
      {children}
    </Link>
  );
}
