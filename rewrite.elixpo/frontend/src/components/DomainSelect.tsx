"use client";

import { useState, useRef, useEffect } from "react";

const DOMAINS = [
  { value: "general", label: "General" },
  { value: "cs", label: "Computer Science" },
  { value: "medicine", label: "Medicine" },
  { value: "law", label: "Law" },
  { value: "humanities", label: "Humanities" },
];

interface DomainSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function DomainSelect({ value, onChange }: DomainSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = DOMAINS.find((d) => d.value === value) || DOMAINS[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-bg-glass border border-border-light rounded-lg px-2.5 py-1.5 text-xs text-text-secondary hover:border-border-hover transition-all"
      >
        {selected.label}
        <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-lg border border-border-light bg-[#1a1f1c] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] overflow-hidden">
          {DOMAINS.map((d) => (
            <button
              key={d.value}
              onClick={() => {
                onChange(d.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-all ${
                d.value === value
                  ? "bg-lime-dim text-lime"
                  : "text-text-secondary hover:bg-bg-glass-hover hover:text-text-primary"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
