"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { startLogin } from "@/lib/auth";
import { getLimits, getPlan } from "@/lib/plans";
import { getGuestUsageToday } from "@/lib/api";

export function Navbar() {
  const { user, loggedIn, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const plan = getPlan(loggedIn, false);
  const limits = getLimits(loggedIn, false);
  const checksUsed = getGuestUsageToday();

  // Is the user in a focused workspace (paper editor or session)?
  const isWorkspace = pathname.startsWith("/paper/") || pathname.startsWith("/session");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const initials = user?.displayName
    ? user.displayName.split(/[\s-]+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-border-light bg-[rgba(20,25,22,0.85)] backdrop-blur-xl">
      <div className="w-full px-4 h-12 flex items-center justify-between">
        {/* Left — logo + user (workspace mode) + nav */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="ReWrite" width={26} height={26} className="rounded-md" />
            <span className="text-[15px] font-bold font-display text-gradient hidden sm:block">
              ReWrite
            </span>
          </Link>

          {/* In workspace mode, show user inline next to logo */}
          {isWorkspace && user && (
            <>
              <span className="text-border-light text-sm">/</span>
              <span className="text-text-secondary text-xs">{user.displayName}</span>
            </>
          )}

          {/* Nav links — hide in workspace to save space */}
          {!isWorkspace && (
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <NavLink href="/" active={isActive("/")}>Home</NavLink>
              <NavLink href="/about" active={isActive("/about")}>About</NavLink>
              <NavLink href="/learn" active={isActive("/learn")}>Learn</NavLink>
              <NavLink href="/pricing" active={isActive("/pricing")}>Pricing</NavLink>
              {loggedIn && <NavLink href="/session" active={isActive("/session")}>Sessions</NavLink>}
            </div>
          )}
        </div>

        {/* Right — plan badge + avatar/menu */}
        <div className="flex items-center gap-3">
          {loggedIn && !loading && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border hidden sm:inline-block ${
              plan === "pro"
                ? "bg-[rgba(251,191,36,0.08)] text-honey border-[rgba(251,191,36,0.25)]"
                : "bg-lime-dim text-lime border-lime-border"
            }`}>
              {plan === "pro" ? "Pro" : "Free"}
            </span>
          )}

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-bg-glass animate-pulse" />
          ) : user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-8 h-8 rounded-full bg-lime-dim border border-lime-border text-lime text-[11px] font-bold flex items-center justify-center hover:bg-[rgba(163,230,53,0.22)] hover:scale-105 transition-all"
              >
                {initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-xl border border-border-light bg-editor-bg shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
                  {/* Profile */}
                  <div className="px-4 py-3.5 border-b border-border-light flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-lime-dim border border-lime-border text-lime text-xs font-bold flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{user.displayName}</p>
                      <p className="text-[11px] text-text-muted truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="px-4 py-3 border-b border-border-light space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Usage today</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                        plan === "pro"
                          ? "bg-[rgba(251,191,36,0.08)] text-honey border-[rgba(251,191,36,0.25)]"
                          : "bg-lime-dim text-lime border-lime-border"
                      }`}>
                        {plan === "pro" ? "Pro" : "Free"}
                      </span>
                    </div>
                    <UsageRow label="AI checks" used={checksUsed} limit={limits.checksPerDay} />
                    <UsageRow label="Rewrites" used={0} limit={limits.rewritesPerDay} />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Word limit</span>
                      <span className="text-text-secondary font-mono">{limits.maxWords.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="py-1">
                    {plan !== "pro" && (
                      <MenuItem href="/pricing" icon={<StarIcon />} className="text-honey">
                        Upgrade to Pro
                      </MenuItem>
                    )}
                    <MenuItem href="/" icon={<HomeIcon />}>Home</MenuItem>
                    <MenuItem href="/session" icon={<ListIcon />}>Session history</MenuItem>
                    <MenuItem href="/pricing" icon={<CreditIcon />}>Pricing</MenuItem>
                    <div className="border-t border-border-light my-1" />
                    <button
                      onClick={() => { signOut(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-text-muted hover:bg-bg-glass-hover hover:text-error transition-colors"
                    >
                      <LogoutIcon />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={startLogin}
              className="btn-primary px-4 py-1.5 rounded-lg text-xs"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active ? "bg-bg-glass text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-bg-glass"
      }`}
    >
      {children}
    </Link>
  );
}

function MenuItem({ href, icon, className, children }: { href: string; icon: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-bg-glass-hover transition-colors ${className || "text-text-secondary"}`}>
      {icon}{children}
    </Link>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const atLimit = !isUnlimited && used >= limit;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text-muted">{label}</span>
        <span className={`font-mono ${atLimit ? "text-error" : "text-text-secondary"}`}>
          {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
          <div className={`h-full rounded-full transition-all ${atLimit ? "bg-error" : pct > 70 ? "bg-warning" : "bg-lime"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function StarIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M8 2L10 6L14 6.5L11 9.5L12 14L8 12L4 14L5 9.5L2 6.5L6 6L8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>; }
function HomeIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M2 8L8 2L14 8M4 7V14H7V10H9V14H12V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ListIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M2 4H14M2 8H14M2 12H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>; }
function CreditIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M2 5H14V13H2ZM2 8H14M5 5V3H11V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function LogoutIcon() { return <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M6 2H3V14H6M11 5L14 8L11 11M6 8H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
