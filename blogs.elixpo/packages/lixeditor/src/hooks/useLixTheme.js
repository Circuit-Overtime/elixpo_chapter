'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LixThemeContext = createContext(null);

/**
 * Theme provider for the LixEditor package.
 * Manages light/dark theme and applies it to the document.
 *
 * @param {Object} props
 * @param {'light'|'dark'} [props.defaultTheme='light'] - Initial theme
 * @param {string} [props.storageKey='lixeditor_theme'] - localStorage key for persistence
 * @param {React.ReactNode} props.children
 */
export function LixThemeProvider({ children, defaultTheme = 'light', storageKey = 'lixeditor_theme' }) {
  const [theme, setTheme] = useState(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'dark' || saved === 'light') setTheme(saved);
    }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
    if (storageKey) localStorage.setItem(storageKey, theme);
  }, [theme, mounted, storageKey]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const isDark = theme === 'dark';

  return (
    <LixThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, mounted }}>
      {children}
    </LixThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme.
 * Falls back to detecting data-theme attribute if no provider is present.
 */
export function useLixTheme() {
  const ctx = useContext(LixThemeContext);
  if (ctx) return ctx;

  // Fallback: detect theme from DOM
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  return { theme: isDark ? 'dark' : 'light', isDark, toggleTheme: () => {}, setTheme: () => {}, mounted: true };
}
