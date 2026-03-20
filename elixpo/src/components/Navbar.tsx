"use client";

import Link from "next/link";
import { useState } from "react";
import navigationData from "@/data/navigation.json";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
          {navigationData.brand.name}
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navigationData.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/signin" className="text-sm text-muted hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link
            href={navigationData.cta.href}
            className="text-sm font-medium px-5 py-2 rounded-full border border-foreground text-foreground hover:bg-foreground hover:text-white transition-colors"
          >
            {navigationData.cta.label}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white px-6 py-4 space-y-3">
          {navigationData.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm text-muted hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={navigationData.cta.href}
            className="block text-sm font-medium px-5 py-2 rounded-full border border-foreground text-foreground text-center hover:bg-foreground hover:text-white transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            {navigationData.cta.label}
          </Link>
        </div>
      )}
    </nav>
  );
}
