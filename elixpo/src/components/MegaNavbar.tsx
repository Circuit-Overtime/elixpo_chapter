"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, ArrowUpRight, BookOpen, GitPullRequest, Scale, Network, Palette, type LucideIcon } from "lucide-react";
import { ELIXPO_LINKS } from "@/lib/elixpo-links";

interface NavLink {
  label: string;
  href: string;
  icon?: LucideIcon;
}

// Primary routes shown as text labels.
const PRIMARY_LINKS: NavLink[] = [
  { label: "Projects", href: "/projects" },
  { label: "Features", href: "/features" },
  { label: "About", href: "/about" },
  { label: "Community", href: "/community" },
];

// Secondary routes condensed to icons (tooltip on hover) to keep the bar light.
const ICON_LINKS: NavLink[] = [
  { label: "Architecture", href: "/architecture", icon: Network },
  { label: "Brand", href: "/assets", icon: Palette },
  { label: "Open Source", href: "/resources", icon: BookOpen },
  { label: "Contributing", href: "/contributing", icon: GitPullRequest },
  { label: "Code of Conduct", href: "/code-of-conduct", icon: Scale },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...ICON_LINKS];

export function MegaNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl px-4 mt-4">
      {/* Centered floating capsule */}
      <nav className="flex items-center justify-between mx-auto bg-black/90 backdrop-blur-md border border-white/10 rounded-full py-2 pl-5 pr-2 shadow-xl select-none">

        {/* Brand */}
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-[#E1E0CC] hover:text-white transition-colors shrink-0 font-serif italic pr-3"
        >
          Elixpo
        </Link>

        {/* Desktop primary links - centered */}
        <div className="hidden md:flex items-center justify-center gap-1 flex-1">
          {PRIMARY_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 text-[10px] lg:text-xs uppercase tracking-widest font-mono transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-[#E1E0CC]/80 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop secondary links - icons, to the right */}
        <div className="hidden md:flex items-center gap-0.5 shrink-0 pr-2">
          {ICON_LINKS.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon!;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                aria-label={link.label}
                className={`p-1.5 rounded-md transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-[#E1E0CC]/65 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={15} strokeWidth={1.75} />
              </Link>
            );
          })}
        </div>

        {/* Desktop GitHub CTA */}
        <a
          href={ELIXPO_LINKS.githubChapter}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 text-[10px] lg:text-xs uppercase tracking-widest font-mono bg-primary text-black rounded-full px-4 py-1.5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span>GitHub</span>
          <ArrowUpRight size={12} />
        </a>

        {/* Mobile trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 text-[#E1E0CC] hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </nav>

      {/* Mobile expansion layer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="nav-mobile-expansion"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden absolute top-14 inset-x-0 bg-[#070707] border border-white/10 rounded-2xl p-4 mt-2 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex flex-col gap-1">
              {ALL_LINKS.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 text-xs uppercase font-mono py-2 px-1 rounded-lg hover:bg-white/5 transition-colors ${
                      isActive ? "text-primary" : "text-[#DEDBC8]"
                    }`}
                  >
                    {Icon && <Icon size={14} strokeWidth={1.75} className="text-[#DEDBC8]/60" />}
                    {link.label}
                  </Link>
                );
              })}
              <a
                href={ELIXPO_LINKS.githubChapter}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 flex items-center justify-center gap-1.5 text-xs uppercase font-mono bg-primary text-black rounded-full px-4 py-2 hover:opacity-90 transition-opacity"
              >
                <span>Star on GitHub</span>
                <ArrowUpRight size={12} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
