"use client";

import { useState } from "react";

export default function TaskBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 rounded-xl border border-amber-200/50 bg-amber-50/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-amber-100/30 transition-colors"
      >
        <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            {expanded ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
          </svg>
        </div>
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Processing</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1">
          <pre className="text-xs text-amber-800/70 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
        </div>
      )}
    </div>
  );
}
