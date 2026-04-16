#!/usr/bin/env node
'use strict';

// Blocks shell grep/rg/ag/ack on code symbols, suggests serena instead

const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (input.tool_name !== 'Bash') return process.exit(0);

    const command = (input.tool_input && input.tool_input.command) || '';

    // Only intercept grep-family commands
    if (!/\b(grep|rg|ag|ack)\b/.test(command)) return process.exit(0);
    // git grep is fine (history search)
    if (/\bgit\s+grep\b/.test(command)) return process.exit(0);
    // rtk-wrapped grep is fine (already optimized)
    if (/^rtk\s/.test(command)) return process.exit(0);

    // Extract search pattern
    const match = command.match(/(?:grep|rg|ag|ack)\s+(?:-[a-zA-Z]+\s+)*['"]?([^'"\s\-][^'"]*?)['"]?\s/);
    if (!match) return process.exit(0);

    const searchPattern = match[1].trim();
    if (!isCodeSymbol(searchPattern)) return process.exit(0);

    const hasUpper = /^[A-Z]/.test(searchPattern);
    const tool = hasUpper
      ? `mcp__serena__find_symbol with name_path_pattern='${searchPattern}'`
      : `mcp__serena__find_referencing_symbols with name_path_pattern='${searchPattern}'`;

    const output = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Shell grep blocked: '${searchPattern}' is a code symbol. Use ${tool} instead. Shell grep scans bytes; serena resolves symbols in the AST.`,
        additionalContext: `Do not retry with grep/rg. Call serena or jCodeMunch directly. If this is a literal text search (not a symbol), add a comment: # text-search to indicate intent.`
      }
    };

    process.stdout.write(JSON.stringify(output) + '\n');
    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});

function isCodeSymbol(s) {
  if (s.length < 4) return false;
  if (/\s/.test(s)) return false;
  if (/[&?+[\]{}()\\^$*|]/.test(s)) return false;

  const allow = [
    /^(TODO|FIXME|HACK|XXX)$/i,
    /^[a-z]{1,8}$/,
    /^[A-Z_]{3,}$/,
    /^(error|warning|success|failed|true|false|null|undefined)$/i,
  ];
  if (allow.some(rx => rx.test(s))) return false;

  // Skip if targeting non-code files
  if (/\.(sql|md|log|txt|json|yaml|yml)/.test(s)) return false;

  const isCamelCase = /^[a-z][a-zA-Z0-9]{3,}$/.test(s) && /[A-Z]/.test(s);
  const isPascalCase = /^[A-Z][a-zA-Z][a-zA-Z0-9]{2,}$/.test(s);
  const isDotted = /^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*$/i.test(s);
  const isSnake = /^[a-z]+(_[a-z]+){2,}$/.test(s) && s.length >= 9;

  return isCamelCase || isPascalCase || isDotted || isSnake;
}
