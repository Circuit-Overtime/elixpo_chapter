"use client";

import { useState, useEffect } from "react";
import { isLoggedIn, getStoredUser, clearAuth, setAuthToken, setStoredUser } from "@/lib/api";
import { startLogin } from "@/lib/auth";

export function Navbar() {
  const [user, setUser] = useState<{ displayName: string; email: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check for auth callback data in URL
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get("auth_success");
    const authError = params.get("auth_error");

    if (authSuccess) {
      try {
        const data = JSON.parse(decodeURIComponent(authSuccess));
        setAuthToken(data.access_token);
        setStoredUser(data.user);
        setUser(data.user);
        // Clean URL
        window.history.replaceState({}, "", "/");
      } catch (e) {
        console.error("Failed to parse auth data:", e);
      }
    }

    if (authError) {
      console.error("Auth error:", authError);
      window.history.replaceState({}, "", "/");
    }

    // Load existing user
    if (!authSuccess && isLoggedIn()) {
      const stored = getStoredUser();
      if (stored) setUser(stored);
    }
  }, []);

  const handleSignOut = () => {
    clearAuth();
    setUser(null);
  };

  if (!mounted) return null;

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

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-text-secondary">{user.displayName}</span>
              <button
                onClick={handleSignOut}
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
