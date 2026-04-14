"use client";

import { useRef, useCallback, useMemo } from "react";

export interface DiffChunk {
  paraIndex: number;
  originalText: string;
  rewrittenText: string;
  startLine: number;
  endLine: number;
}

interface TexEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  paragraphScores?: Array<{ startLine: number; score: number }>;
  activeParagraph?: number;
  /** When provided, editor switches to diff view */
  diffs?: DiffChunk[];
  /** Original text before rewrite — needed for diff rendering */
  originalValue?: string;
  lockMessage?: string;
}

const LINE_HEIGHT = 22;
const GUTTER_WIDTH = 48;

export function TexEditor({
  value,
  onChange,
  readOnly = false,
  paragraphScores,
  activeParagraph,
  diffs,
  originalValue,
  lockMessage,
}: TexEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => value.split("\n"), [value]);
  const showDiff = diffs && diffs.length > 0 && originalValue;

  const handleScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = value.substring(0, start) + "  " + value.substring(end);
        onChange(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange]
  );

  const lineScores = useMemo(() => {
    const map = new Map<number, number>();
    if (!paragraphScores) return map;
    for (const ps of paragraphScores) map.set(ps.startLine, ps.score);
    return map;
  }, [paragraphScores]);

  return (
    <div className="editor-container flex flex-col relative h-full">
      {/* Lock overlay — blur + shimmer + bottom pill */}
      {lockMessage && (
        <>
          <div className="absolute inset-0 z-10 backdrop-blur-[1.5px] pointer-events-none" />
          <div className="absolute inset-0 z-10 pointer-events-none editor-shimmer" />
          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-editor-bg border border-lime-border text-lime text-xs font-medium shadow-lg">
              <span className="w-3 h-3 rounded-full border-2 border-lime border-t-transparent animate-spin" />
              {lockMessage}
            </div>
          </div>
        </>
      )}

      {/* Toolbar */}
      <div className="editor-toolbar shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-text-subtle text-xs font-mono ml-2">document.tex</span>
        <div className="flex-1" />
        {showDiff && (
          <span className="text-lime text-[10px] font-mono mr-2">
            {diffs.length} changed
          </span>
        )}
        <span className="text-text-subtle text-xs">{lines.length} lines</span>
      </div>

      {/* Editor body — fills remaining height, scrolls inside */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {showDiff ? (
          /* ---- Diff view ---- */
          <DiffView originalValue={originalValue} newValue={value} diffs={diffs} />
        ) : (
          /* ---- Normal editor ---- */
          <>
            {/* Gutter */}
            <div
              ref={gutterRef}
              className="shrink-0 overflow-hidden select-none bg-editor-gutter text-text-subtle"
              style={{ width: GUTTER_WIDTH }}
            >
              <div className="py-3">
                {lines.map((_, i) => {
                  const score = lineScores.get(i);
                  const isActive = activeParagraph !== undefined && activeParagraph === i;
                  return (
                    <div
                      key={i}
                      className={`px-2 text-right text-xs ${isActive ? "bg-lime-dim text-lime" : ""}`}
                      style={{ lineHeight: `${LINE_HEIGHT}px`, minHeight: LINE_HEIGHT }}
                    >
                      {score !== undefined ? (
                        <span className={`text-[10px] font-bold ${
                          score >= 60 ? "text-error" : score >= 20 ? "text-warning" : "text-success"
                        }`}>
                          {score.toFixed(0)}%
                        </span>
                      ) : (
                        i + 1
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              readOnly={readOnly || !!lockMessage}
              spellCheck={false}
              className="flex-1 bg-transparent text-text-primary font-mono text-[13px] py-3 px-4 resize-none outline-none overflow-auto caret-lime"
              style={{
                lineHeight: `${LINE_HEIGHT}px`,
                tabSize: 2,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
              placeholder={"% Paste your LaTeX document here...\n\\documentclass{article}\n\\begin{document}\n\nYour text goes here.\n\n\\end{document}"}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ====================================================================
// Inline diff view — shows removed (red) and added (green) lines
// ====================================================================

interface DiffLine {
  type: "same" | "removed" | "added";
  text: string;
  lineNo: number | null; // original line number for same/removed, new for added
}

function computeDiffLines(original: string, rewritten: string): DiffLine[] {
  const origLines = original.split("\n");
  const newLines = rewritten.split("\n");
  const result: DiffLine[] = [];

  let oi = 0;
  let ni = 0;

  while (oi < origLines.length || ni < newLines.length) {
    if (oi >= origLines.length) {
      // Remaining new lines are additions
      result.push({ type: "added", text: newLines[ni], lineNo: ni + 1 });
      ni++;
    } else if (ni >= newLines.length) {
      // Remaining old lines are deletions
      result.push({ type: "removed", text: origLines[oi], lineNo: oi + 1 });
      oi++;
    } else if (origLines[oi] === newLines[ni]) {
      // Same
      result.push({ type: "same", text: origLines[oi], lineNo: oi + 1 });
      oi++;
      ni++;
    } else {
      // Find how many lines differ in this block
      // Look ahead to find next matching line
      let matchOffset = -1;
      for (let look = 1; look < 20 && ni + look < newLines.length; look++) {
        if (origLines[oi] === newLines[ni + look]) {
          matchOffset = look;
          break;
        }
      }

      let origMatchOffset = -1;
      for (let look = 1; look < 20 && oi + look < origLines.length; look++) {
        if (origLines[oi + look] === newLines[ni]) {
          origMatchOffset = look;
          break;
        }
      }

      if (origMatchOffset >= 0 && (matchOffset < 0 || origMatchOffset <= matchOffset)) {
        // Original lines were removed, then we re-sync
        for (let k = 0; k < origMatchOffset; k++) {
          result.push({ type: "removed", text: origLines[oi], lineNo: oi + 1 });
          oi++;
        }
      } else if (matchOffset >= 0) {
        // New lines were added, then we re-sync
        for (let k = 0; k < matchOffset; k++) {
          result.push({ type: "added", text: newLines[ni], lineNo: ni + 1 });
          ni++;
        }
      } else {
        // No re-sync found — treat as remove old + add new
        result.push({ type: "removed", text: origLines[oi], lineNo: oi + 1 });
        oi++;
        result.push({ type: "added", text: newLines[ni], lineNo: ni + 1 });
        ni++;
      }
    }
  }

  return result;
}

function DiffView({ originalValue, newValue, diffs }: {
  originalValue: string;
  newValue: string;
  diffs: DiffChunk[];
}) {
  const diffLines = useMemo(
    () => computeDiffLines(originalValue, newValue),
    [originalValue, newValue]
  );

  const stats = useMemo(() => {
    let added = 0, removed = 0;
    for (const l of diffLines) {
      if (l.type === "added") added++;
      else if (l.type === "removed") removed++;
    }
    return { added, removed };
  }, [diffLines]);

  return (
    <div className="flex-1 overflow-auto font-mono text-[13px]" style={{ lineHeight: `${LINE_HEIGHT}px` }}>
      {/* Diff stats header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-1.5 bg-editor-gutter border-b border-border-light text-[11px]">
        <span className="text-success font-mono">+{stats.added} added</span>
        <span className="text-error font-mono">-{stats.removed} removed</span>
      </div>

      {/* Diff lines */}
      <div className="py-1">
        {diffLines.map((line, i) => (
          <div
            key={i}
            className={`flex ${
              line.type === "removed"
                ? "bg-[rgba(239,68,68,0.08)]"
                : line.type === "added"
                ? "bg-[rgba(163,230,53,0.08)]"
                : ""
            }`}
          >
            {/* Gutter */}
            <div
              className="shrink-0 text-right select-none px-1.5"
              style={{ width: GUTTER_WIDTH, minHeight: LINE_HEIGHT }}
            >
              <span className={`text-xs ${
                line.type === "removed" ? "text-error" :
                line.type === "added" ? "text-lime" :
                "text-text-subtle"
              }`}>
                {line.type === "removed" ? "-" : line.type === "added" ? "+" : line.lineNo}
              </span>
            </div>

            {/* Sign */}
            <div
              className={`shrink-0 w-5 text-center select-none ${
                line.type === "removed" ? "text-error" :
                line.type === "added" ? "text-lime" :
                "text-transparent"
              }`}
              style={{ minHeight: LINE_HEIGHT }}
            >
              {line.type === "removed" ? "−" : line.type === "added" ? "+" : " "}
            </div>

            {/* Content */}
            <div
              className={`flex-1 px-2 ${
                line.type === "removed"
                  ? "text-error/70 line-through"
                  : line.type === "added"
                  ? "text-lime"
                  : "text-text-primary"
              }`}
              style={{
                minHeight: LINE_HEIGHT,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                tabSize: 2,
              }}
            >
              {line.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
