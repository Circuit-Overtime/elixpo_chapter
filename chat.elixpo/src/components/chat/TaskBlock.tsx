"use client";

import { useState, useEffect } from "react";

interface TaskGroupProps {
  tasks: string[];
  isStreaming: boolean;
}

interface ParsedTask {
  action: string;
  query: string;
  results: { title: string; url: string; domain: string }[];
  raw: string;
}

const THINKING_PHRASES = [
  "Hmm, looking into it...",
  "Let me dig into this...",
  "Pulling up what I can find...",
  "Gathering the details...",
  "On it, give me a sec...",
];

function parseTask(raw: string): ParsedTask {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  let action = "";
  let query = "";
  const results: ParsedTask["results"] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect action type from content
    if (!action) {
      if (lower.includes("search")) action = "Searched the web";
      else if (lower.includes("read") || lower.includes("fetch")) action = "Reading sources";
      else if (lower.includes("analyz")) action = "Analyzing content";
      else if (lower.includes("think") || lower.includes("reason")) action = "Thinking";
      else action = line.slice(0, 40);
    }

    // Extract query — quoted or after common keywords
    if (!query) {
      const qMatch = line.match(/"([^"]+)"|(?:for|about|query|searching)\s+(.+)/i);
      if (qMatch) query = (qMatch[1] || qMatch[2] || "").trim();
    }

    // Extract URLs as results
    const urlMatch = line.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) {
      try {
        const u = new URL(urlMatch[0]);
        const domain = u.hostname.replace(/^www\./, "");
        const title = line.replace(urlMatch[0], "").replace(/[-–—|:•]/g, "").trim() || u.pathname.replace(/\//g, " ").trim().slice(0, 60);
        results.push({ title: title.slice(0, 80) || domain, url: urlMatch[0], domain });
      } catch { /* */ }
    }
  }

  return { action: action || "Processing", query, results, raw };
}

export default function TaskGroup({ tasks, isStreaming }: TaskGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const [headerText] = useState(() => THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]);
  const parsed = tasks.map(parseTask);

  // Derive a done label from what was actually done
  const doneLabel = (() => {
    const actions = parsed.map((t) => t.action);
    if (actions.some((a) => a.includes("web"))) return "Searched the web";
    if (actions.some((a) => a.includes("Reading"))) return "Read sources";
    if (actions.some((a) => a.includes("Thinking"))) return "Thought about it";
    return "Done";
  })();

  // Auto-collapse when streaming finishes
  useEffect(() => {
    if (!isStreaming && expanded) setExpanded(false);
  }, [isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tasks.length) return null;

  // Collect all results across tasks
  const allResults = parsed.flatMap((t) => t.results);
  const uniqueResults = allResults.filter((r, i, arr) => arr.findIndex((x) => x.domain === r.domain) === i);

  return (
    <div className="mb-3">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 cursor-pointer"
      >
        {isStreaming ? (
          <div className="w-4 h-4 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
        )}
        <span className={`text-sm ${isStreaming ? "text-neutral-600" : "text-neutral-400"}`}>
          {isStreaming ? headerText : doneLabel}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.5" strokeLinecap="round"
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 ml-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {/* Steps */}
          {parsed.map((task, i) => (
            <div key={i} className="px-4 py-2.5 border-b border-neutral-50 last:border-0">
              <div className="flex items-center gap-2">
                {task.action.includes("web") ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                )}
                <span className="text-sm text-neutral-700 font-medium">{task.query || task.action}</span>
                {task.results.length > 0 && (
                  <span className="ml-auto text-xs text-neutral-400">{task.results.length} results</span>
                )}
              </div>

              {/* Results for this task */}
              {task.results.length > 0 && (
                <div className="mt-1.5 ml-5 max-h-40 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {task.results.map((r, j) => (
                    <a
                      key={j}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 py-1.5 hover:bg-neutral-50 rounded px-1 transition-colors"
                    >
                      <img src={`https://www.google.com/s2/favicons?domain=${r.domain}&sz=32`} alt="" width={14} height={14} className="rounded-sm opacity-50" />
                      <span className="text-sm text-neutral-600 truncate flex-1">{r.title}</span>
                      <span className="text-xs text-neutral-400">{r.domain}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
