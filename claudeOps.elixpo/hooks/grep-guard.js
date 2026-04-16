#!/usr/bin/env node
'use strict';

// Blocks Grep on code symbols, suggests serena instead
// Uses permissionDecision: "deny" via exit 0 + JSON stdout

const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (input.tool_name !== 'Grep') return process.exit(0);

    const pattern = (input.tool_input && input.tool_input.pattern) || '';
    if (pattern.length < 4) return process.exit(0);

    // Skip non-code file type filters
    const glob = (input.tool_input && input.tool_input.glob) || '';
    const type = (input.tool_input && input.tool_input.type) || '';
    if (/\.(md|txt|log|json|yaml|yml|toml|csv|sql|html|css|svg)$/i.test(glob)) return process.exit(0);

    // Strip regex syntax for symbol detection
    const raw = pattern.replace(/[\\^$.*+?()[\]{}|]/g, ' ').trim();
    const tokens = raw.split(/\s+/).filter(Boolean);
    const symbols = tokens.filter(isCodeSymbol);

    if (symbols.length === 0) return process.exit(0);

    const hasUpper = symbols.some(t => /^[A-Z]/.test(t));
    const tool = hasUpper
      ? `mcp__serena__find_symbol with name_path_pattern='${symbols[0]}'`
      : `mcp__serena__find_referencing_symbols with name_path_pattern='${symbols[0]}'`;

    const output = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Grep blocked: '${symbols.join(', ')}' looks like code symbol(s). Use ${tool} instead. Grep is for literal text searches only.`,
        additionalContext: `Use serena for code symbol navigation. Also available: mcp__jcodemunch__search_symbols, mcp__serena__get_symbols_overview.`
      }
    };

    process.stdout.write(JSON.stringify(output) + '\n');
    process.exit(0);
  } catch (e) {
    process.exit(0); // fail open
  }
});

function isCodeSymbol(s) {
  if (s.length < 4) return false;
  if (/\s/.test(s)) return false;
  if (/[&?+[\]{}()\\^$*|]/.test(s)) return false;

  // Allowlist: not navigation targets
  const allow = [
    /^(TODO|FIXME|HACK|XXX|NOTE)/i,
    /^console\./,
    /^import\b/,
    /^require\(/,
    /^export\b/,
    /^\/\//,
    /^#/,
    /^\./,
    /^http/i,
    /^\d/,
    /^[A-Z_]{3,}$/,         // SCREAMING_SNAKE constants
    /^[a-z]{1,8}$/,          // common short words
    /^['"`]/,
    /^(error|warning|info|debug|trace|true|false|null|undefined)$/i,
    /^(text|bg|border|flex|grid|p|m|w|h|gap|rounded|shadow|font)-/,  // Tailwind
    /^(Security|Components|Services|Models|Types|Config|Utils|Hooks|Pages|Auth|Admin|Dashboard|Settings|Profile|Tests|Docs|Public|Static|Assets|Error|Warning|Result|Input|Output|State|Event|Action|Route|Table|Index|Setup|Build|Deploy|Release)$/,  // Common standalone PascalCase words
  ];
  if (allow.some(rx => rx.test(s))) return false;

  const isCamelCase = /^[a-z][a-zA-Z0-9]{3,}$/.test(s) && /[A-Z]/.test(s);
  const isPascalCase = /^[A-Z][a-zA-Z][a-zA-Z0-9]{2,}$/.test(s);
  const isDotted = /^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*$/i.test(s);
  const isSnake = /^[a-z]+(_[a-z]+){2,}$/.test(s) && s.length >= 9;

  return isCamelCase || isPascalCase || isDotted || isSnake;
}
