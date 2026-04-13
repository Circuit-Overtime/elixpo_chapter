"use client";

import { useAuth } from "@/lib/AuthContext";
import { startLogin } from "@/lib/auth";

export function Navbar() {
  const { user, loading, signOut } = useAuth();

  return (
    <nav className="border-b border-border-light">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <a href="/" className="text-lg font-bold font-display text-gradient">
          ReWrite
        </a>
        <div className="flex items-center gap-4 text-xs">
          <a href="/pricing" className="text-text-muted hover:text-text-primary transition-colors">
            Pricing
          </a>

          {loading ? (
            <span className="w-16 h-5 rounded bg-bg-glass animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-text-secondary">{user.displayName}</span>
              <button
                onClick={signOut}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={startLogin}
              className="btn-primary px-3 py-1 rounded-lg text-xs"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
