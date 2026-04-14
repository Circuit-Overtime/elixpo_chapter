"use client";

import { useRef, useCallback, useMemo, useEffect, useState } from "react";

interface TexEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  paragraphScores?: Array<{ startLine: number; score: number }>;
  activeParagraph?: number;
}

const LINE_HEIGHT = 22;
const FONT_SIZE = 13;
const PAD_TOP = 12;
const PAD_LEFT = 16;
const PAD_RIGHT = 16;
const GUTTER_WIDTH = 48;

export function TexEditor({
  value,
  onChange,
  readOnly = false,
  paragraphScores,
  activeParagraph,
}: TexEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const lines = useMemo(() => value.split("\n"), [value]);

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const top = ta.scrollTop;
    const left = ta.scrollLeft;
    setScrollTop(top);
    setScrollLeft(left);
    if (gutterRef.current) gutterRef.current.scrollTop = top;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = top;
      highlightRef.current.scrollLeft = left;
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

  // Shared text style — must be identical on textarea and highlight pre
  const textStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: FONT_SIZE,
    lineHeight: `${LINE_HEIGHT}px`,
    tabSize: 2,
    whiteSpace: "pre",
    wordWrap: "normal",
    overflowWrap: "normal",
    padding: `${PAD_TOP}px ${PAD_RIGHT}px ${PAD_TOP}px ${PAD_LEFT}px`,
    margin: 0,
    border: "none",
    outline: "none",
  };

  return (
    <div className="editor-container flex flex-col">
      {/* Toolbar */}
      <div className="editor-toolbar shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-text-subtle text-xs font-mono ml-2">document.tex</span>
        <div className="flex-1" />
        <span className="text-text-subtle text-xs">
          {lines.length} lines
        </span>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 min-h-[400px] max-h-[600px] relative">
        {/* Gutter */}
        <div
          ref={gutterRef}
          className="shrink-0 overflow-hidden select-none bg-editor-gutter text-text-subtle"
          style={{ width: GUTTER_WIDTH }}
        >
          <div style={{ paddingTop: PAD_TOP }}>
            {lines.map((_, i) => {
              const score = lineScores.get(i);
              const isActive = activeParagraph !== undefined && activeParagraph === i;
              return (
                <div
                  key={i}
                  className={`px-2 text-right text-xs ${isActive ? "bg-lime-dim text-lime" : ""}`}
                  style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
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

        {/* Highlight layer — rendered pre with colored spans, scroll-synced */}
        <pre
          ref={highlightRef}
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            ...textStyle,
            left: GUTTER_WIDTH,
            right: 0,
            top: 0,
            bottom: 0,
            color: "transparent", // fallback
            background: "transparent",
          }}
          aria-hidden="true"
        >
          {highlightTex(value)}
        </pre>

        {/* Textarea — transparent text, visible caret */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          className="flex-1 bg-transparent resize-none caret-lime"
          style={{
            ...textStyle,
            color: "transparent",
            caretColor: "var(--color-lime)",
            WebkitTextFillColor: "transparent",
            overflow: "auto",
          }}
          placeholder={"% Paste your LaTeX document here...\n\\documentclass{article}\n\\begin{document}\n\nYour text goes here.\n\n\\end{document}"}
        />
      </div>
    </div>
  );
}

// ====================================================================
// LaTeX syntax highlighter — full tokenizer
// ====================================================================

type TokenType =
  | "comment"
  | "command"
  | "section"
  | "env"
  | "math-delim"
  | "math-body"
  | "brace"
  | "bracket"
  | "argument"
  | "text";

interface Token {
  type: TokenType;
  value: string;
}

const SECTION_COMMANDS = new Set([
  "documentclass", "usepackage", "title", "author", "date",
  "chapter", "section", "subsection", "subsubsection",
  "paragraph", "subparagraph", "part",
  "tableofcontents", "maketitle",
]);

const ENV_COMMANDS = new Set(["begin", "end"]);

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Comment — rest of line
    if (line[i] === "%" && (i === 0 || line[i - 1] !== "\\")) {
      tokens.push({ type: "comment", value: line.slice(i) });
      break;
    }

    // Math mode — $$...$$ or $...$
    if (line[i] === "$") {
      const double = line[i + 1] === "$";
      const delim = double ? "$$" : "$";
      const start = i;
      i += delim.length;
      tokens.push({ type: "math-delim", value: delim });

      // Find closing delimiter
      let body = "";
      while (i < line.length) {
        if (line[i] === "$") {
          if (double && line[i + 1] === "$") {
            break;
          } else if (!double) {
            break;
          }
        }
        body += line[i];
        i++;
      }
      if (body) tokens.push({ type: "math-body", value: body });
      if (i < line.length) {
        tokens.push({ type: "math-delim", value: delim });
        i += delim.length;
      }
      continue;
    }

    // Command — \something
    if (line[i] === "\\") {
      const start = i;
      i++;

      // Single special char commands: \\ \{ \} \$ \% \& \# \_ \~ \^
      if (i < line.length && /[\\{}$%&#_~^,;!| ]/.test(line[i])) {
        tokens.push({ type: "command", value: line.slice(start, i + 1) });
        i++;
        continue;
      }

      // Named command
      let name = "";
      while (i < line.length && /[a-zA-Z@*]/.test(line[i])) {
        name += line[i];
        i++;
      }

      if (!name) {
        tokens.push({ type: "text", value: "\\" });
        continue;
      }

      const fullCmd = "\\" + name;

      if (ENV_COMMANDS.has(name)) {
        // \begin{env} or \end{env} — capture the brace group
        tokens.push({ type: "env", value: fullCmd });
        if (i < line.length && line[i] === "{") {
          const braceStart = i;
          let depth = 0;
          while (i < line.length) {
            if (line[i] === "{") depth++;
            else if (line[i] === "}") { depth--; if (depth === 0) { i++; break; } }
            i++;
          }
          tokens.push({ type: "env", value: line.slice(braceStart, i) });
        }
      } else if (SECTION_COMMANDS.has(name)) {
        tokens.push({ type: "section", value: fullCmd });
      } else {
        tokens.push({ type: "command", value: fullCmd });
      }

      // Capture optional argument [...]
      if (i < line.length && line[i] === "[") {
        const bracketStart = i;
        let depth = 0;
        while (i < line.length) {
          if (line[i] === "[") depth++;
          else if (line[i] === "]") { depth--; if (depth === 0) { i++; break; } }
          i++;
        }
        tokens.push({ type: "bracket", value: line.slice(bracketStart, i) });
      }

      // Capture required argument {...}
      if (i < line.length && line[i] === "{") {
        const braceStart = i;
        let depth = 0;
        while (i < line.length) {
          if (line[i] === "{") depth++;
          else if (line[i] === "}") { depth--; if (depth === 0) { i++; break; } }
          i++;
        }
        tokens.push({ type: "argument", value: line.slice(braceStart, i) });
      }

      continue;
    }

    // Standalone braces
    if (line[i] === "{" || line[i] === "}") {
      tokens.push({ type: "brace", value: line[i] });
      i++;
      continue;
    }

    // Plain text — collect until next special char
    let text = "";
    while (i < line.length && !["\\", "$", "%", "{", "}"].includes(line[i])) {
      text += line[i];
      i++;
    }
    if (text) tokens.push({ type: "text", value: text });
  }

  return tokens;
}

const TOKEN_CLASSES: Record<TokenType, string> = {
  comment:      "tex-comment",
  command:      "tex-command",
  section:      "tex-section",
  env:          "tex-env",
  "math-delim": "tex-math",
  "math-body":  "tex-math",
  brace:        "tex-brace",
  bracket:      "tex-bracket",
  argument:     "tex-argument",
  text:         "tex-text",
};

function highlightTex(source: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const lines = source.split("\n");

  for (let li = 0; li < lines.length; li++) {
    if (li > 0) result.push("\n");
    const tokens = tokenizeLine(lines[li]);
    for (let ti = 0; ti < tokens.length; ti++) {
      const t = tokens[ti];
      const cls = TOKEN_CLASSES[t.type];
      if (t.type === "text") {
        result.push(<span key={`${li}-${ti}`} className={cls}>{t.value}</span>);
      } else {
        result.push(<span key={`${li}-${ti}`} className={cls}>{t.value}</span>);
      }
    }
  }

  return result;
}
