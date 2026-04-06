"use client";

export function scoreColor(score: number): string {
  if (score >= 60) return "text-error";
  if (score >= 20) return "text-warning";
  return "text-success";
}

export function scoreBg(score: number): string {
  if (score >= 60) return "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]";
  if (score >= 20) return "bg-[rgba(251,191,36,0.1)] border-[rgba(251,191,36,0.3)]";
  return "bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.3)]";
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = {
    sm: "text-sm px-2 py-0.5",
    md: "text-base px-3 py-1",
    lg: "text-2xl px-4 py-2 font-bold",
  }[size];

  return (
    <span className={`inline-block rounded-full border ${scoreBg(score)} ${scoreColor(score)} ${sizeClass} font-mono`}>
      {score.toFixed(1)}%
    </span>
  );
}

export function ScoreBar({ score, label }: { score: number; label: string }) {
  const color =
    score >= 60 ? "bg-error" : score >= 20 ? "bg-warning" : "bg-success";
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-muted text-sm w-40 shrink-0">{label}</span>
      <div className="progress-track flex-1 h-2">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`font-mono text-sm w-12 text-right ${scoreColor(score)}`}>{score.toFixed(0)}%</span>
    </div>
  );
}
