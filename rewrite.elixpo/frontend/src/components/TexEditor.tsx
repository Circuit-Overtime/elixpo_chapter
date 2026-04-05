"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";

interface TexEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  /** Per-paragraph AI scores shown as gutter annotations */
  paragraphScores?: Array<{ startLine: number; score: number }>;
  /** Currently processing paragraph index */
  activeParagraph?: number;
}

export function TexEditor({
  value,
  onChange,
  readOnly = false,
  paragraphScores,
  activeParagraph,
}: TexEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const lines = useMemo(() => value.split("\n"), [value]);
  const lineCount = lines.length;

  // Sync scroll between textarea and highlight overlay
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    setScrollTop(ta.scrollTop);
    if (highlightRef.current) highlightRef.current.scrollTop = ta.scrollTop;
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  }, []);

  // Handle tab key in editor
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

  // Build score annotations map: line number -> score
  const lineScores = useMemo(() => {
    const map = new Map<number, number>();
    if (!paragraphScores) return map;
    for (const ps of paragraphScores) {
      map.set(ps.startLine, ps.score);
    }
    return map;
  }, [paragraphScores]);

  return (
    <div className="editor-container relative">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-text-subtle text-xs font-mono ml-2">document.tex</span>
        <div className="flex-1" />
        <span className="text-text-subtle text-xs">
          {lineCount} lines · {value.length.toLocaleString()} chars
        </span>
      </div>

      <div className="flex relative" style={{ minHeight: 400, maxHeight: 600 }}>
        {/* Line numbers gutter */}
        <div
          ref={gutterRef}
          className="editor-gutter overflow-hidden shrink-0"
          style={{ marginTop: -scrollTop % 1 }}
        >
          {lines.map((_, i) => {
            const score = lineScores.get(i);
            const isActive = activeParagraph !== undefined && activeParagraph === i;
            return (
              <span
                key={i}
                className={`block px-2.5 ${isActive ? "bg-lime-dim text-lime" : ""}`}
              >
                {score !== undefined ? (
                  <span
                    className={`text-[10px] font-bold ${
                      score >= 60 ? "text-error" : score >= 20 ? "text-warning" : "text-success"
                    }`}
                  >
                    {score.toFixed(0)}%
                  </span>
                ) : (
                  i + 1
                )}
              </span>
            );
          })}
        </div>

        {/* Syntax highlight overlay */}
        <div
          ref={highlightRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ left: 44, paddingTop: 12, paddingLeft: 16, paddingRight: 16 }}
          aria-hidden
        >
          <pre
            className="text-[13px] leading-[1.7] font-mono whitespace-pre-wrap break-words"
            style={{ marginTop: -scrollTop }}
          >
            {highlightTex(value)}
          </pre>
        </div>

        {/* Actual textarea (transparent text, captures input) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          className="editor-content flex-1 overflow-auto caret-lime text-transparent"
          placeholder={`% Paste your LaTeX document here...\n\\documentclass{article}\n\\begin{document}\n\nYour text goes here.\n\n\\end{document}`}
        />
      </div>
    </div>
  );
}

/** Simple LaTeX syntax highlighter — returns JSX spans */
function highlightTex(source: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) nodes.push("\n");
    const line = lines[i];

    if (line.trimStart().startsWith("%")) {
      nodes.push(<span key={`c${i}`} className="tex-comment">{line}</span>);
      continue;
    }

    // Tokenize: commands, braces, math delimiters
    let pos = 0;
    const parts: React.ReactNode[] = [];
    const re = /(\\(?:begin|end)\{[^}]*\})|(\\(?:section|subsection|title|author|date|chapter|paragraph)\b)|(\\[a-zA-Z@]+)|([\{\}])|\$([^$]*)\$/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line)) !== null) {
      // Text before match
      if (m.index > pos) {
        parts.push(line.slice(pos, m.index));
      }

      if (m[1]) {
        // \begin{...} or \end{...}
        parts.push(<span key={`e${i}-${m.index}`} className="tex-env">{m[1]}</span>);
      } else if (m[2]) {
        // Section commands
        parts.push(<span key={`s${i}-${m.index}`} className="tex-section">{m[2]}</span>);
      } else if (m[3]) {
        // Other commands
        parts.push(<span key={`cmd${i}-${m.index}`} className="tex-command">{m[3]}</span>);
      } else if (m[4]) {
        // Braces
        parts.push(<span key={`b${i}-${m.index}`} className="tex-brace">{m[4]}</span>);
      } else if (m[5] !== undefined) {
        // Inline math $...$
        parts.push(<span key={`m${i}-${m.index}`} className="tex-math">${m[5]}$</span>);
      }

      pos = m.index + m[0].length;
    }

    if (pos < line.length) {
      parts.push(line.slice(pos));
    }

    nodes.push(...parts);
  }

  return nodes;
}
