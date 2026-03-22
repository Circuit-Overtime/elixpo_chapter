"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("elixpo_api_url", apiUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Settings
        </h1>
        <p className="text-sm text-[rgba(245,245,244,0.5)] mt-1">
          Configure your Elixpo Agent instance
        </p>
      </div>

      {/* API Connection */}
      <div className="glass-card rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-xl bg-[rgba(163,230,53,0.1)] border border-[rgba(163,230,53,0.15)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5 text-[#a3e635]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          </div>
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            API Connection
          </h2>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[rgba(245,245,244,0.5)]">
            Elixpo Agent Core API URL
          </label>
          <Input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:8000"
            className="bg-[rgba(255,255,255,0.04)] border-white/[0.08] rounded-xl focus:border-[rgba(163,230,53,0.3)] focus:ring-[rgba(163,230,53,0.1)] font-mono text-sm"
          />
          <p className="text-xs text-[rgba(245,245,244,0.35)]">
            The URL of your Elixpo Agent core backend server.
          </p>
        </div>
        <Button
          onClick={handleSave}
          className={`rounded-xl font-semibold px-5 transition-all ${
            saved
              ? "bg-[rgba(34,197,94,0.15)] text-[#4ade80] border border-[rgba(34,197,94,0.3)]"
              : "bg-[#a3e635] text-[#0c0f0a] hover:bg-[#bef264] shadow-[0_0_15px_rgba(163,230,53,0.2)]"
          }`}
        >
          {saved ? (
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Saved
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </div>

      {/* GitHub App */}
      <div className="glass-card rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-xl bg-[rgba(255,255,255,0.06)] border border-white/[0.08]">
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-5 text-[#f5f5f4]">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            GitHub App
          </h2>
        </div>
        <p className="text-sm text-[rgba(245,245,244,0.5)]">
          Install the Elixpo Agent GitHub App to enable{" "}
          <code className="text-[#a3e635] text-xs font-mono bg-[rgba(163,230,53,0.1)] px-1.5 py-0.5 rounded">
            @elixpoo
          </code>{" "}
          mentions on your repositories.
        </p>
        <Button
          variant="outline"
          disabled
          className="rounded-xl border-white/[0.08] text-[rgba(245,245,244,0.4)]"
        >
          Install GitHub App (Coming Soon)
        </Button>
      </div>

      {/* About */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-xl bg-[rgba(196,181,253,0.1)] border border-[rgba(196,181,253,0.15)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5 text-[#c4b5fd]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </div>
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            About
          </h2>
        </div>
        <div className="space-y-2 text-sm text-[rgba(245,245,244,0.5)]">
          <p>
            Elixpo Agent v0.1.0
          </p>
          <p>
            Built by{" "}
            <a
              href="https://github.com/elixpo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a3e635] hover:text-[#bef264] transition-colors"
            >
              Elixpo
            </a>
          </p>
        </div>
        <div className="border-t border-white/[0.06] pt-4 space-y-1.5">
          <p className="text-xs text-[rgba(245,245,244,0.3)] font-mono">
            D1: 4c028188-932f-4808-81ba-67e67a832be7
          </p>
          <p className="text-xs text-[rgba(245,245,244,0.3)] font-mono">
            KV: 8e440b0aebbe4961a655915469da98df
          </p>
        </div>
      </div>
    </div>
  );
}
