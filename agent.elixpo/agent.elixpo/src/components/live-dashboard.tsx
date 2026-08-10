"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Radio } from "lucide-react";
import { BuildingDashboard, FloorDirectoryView, FloorView, JournalView, RunsView, SecurityView, WorkView } from "@/components/dashboard-views";
import type { DashboardSnapshot, FloorDefinition } from "@/lib/dashboard-model";

type DashboardView = "building" | "floors" | "floor" | "runs" | "work" | "journal" | "security";

function dashboardApiRoot() {
  const configured = process.env.NEXT_PUBLIC_DASHBOARD_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.hostname.endsWith(".pages.dev")) {
    return "https://agent-elixpo-api.ayushbhatt633.workers.dev";
  }
  return "/api";
}

export function LiveDashboard({ view, floor }: { view: DashboardView; floor?: FloorDefinition }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${dashboardApiRoot()}/snapshot`, { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);
        return response.json() as Promise<DashboardSnapshot>;
      })
      .then(setSnapshot)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Dashboard API request failed");
      });
    return () => controller.abort();
  }, [attempt]);

  if (error) return <main className="real-page"><section className="live-data-state live-data-error"><AlertTriangle size={24} /><div><strong>Live GitHub data is unavailable</strong><p>{error}</p></div><button onClick={() => { setError(""); setSnapshot(null); setAttempt((value) => value + 1); }}>Retry</button></section></main>;
  if (!snapshot) return <main className="real-page"><section className="live-data-state"><Radio size={24} /><div><strong>Connecting to the operations Worker</strong><p>Loading current GitHub runs and state receipts.</p></div></section></main>;

  if (view === "building") return <BuildingDashboard snapshot={snapshot} />;
  if (view === "floors") return <FloorDirectoryView snapshot={snapshot} />;
  if (view === "floor" && floor) return <FloorView snapshot={snapshot} floor={floor} />;
  if (view === "runs") return <RunsView snapshot={snapshot} />;
  if (view === "work") return <WorkView snapshot={snapshot} />;
  if (view === "journal") return <JournalView snapshot={snapshot} />;
  return <SecurityView snapshot={snapshot} />;
}
