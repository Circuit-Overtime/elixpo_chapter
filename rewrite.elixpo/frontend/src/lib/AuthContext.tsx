"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  isLoggedIn,
  getStoredUser,
  setAuthToken,
  setStoredUser,
  clearAuth,
} from "@/lib/api";

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: User | null;
  loggedIn: boolean;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loggedIn: false,
  loading: true,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for OAuth callback data in URL params
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get("auth_success");
    const authError = params.get("auth_error");

    if (authSuccess) {
      try {
        const data = JSON.parse(decodeURIComponent(authSuccess));
        setAuthToken(data.access_token);
        setStoredUser(data.user);
        setUser(data.user);
      } catch (e) {
        console.error("Failed to parse auth data:", e);
      }
      // Clean URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    } else if (authError) {
      console.error("Auth error:", authError);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (isLoggedIn()) {
      // Load existing session
      const stored = getStoredUser();
      if (stored) setUser(stored);
    }

    setLoading(false);
  }, []);

  const signOut = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loggedIn: user !== null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
