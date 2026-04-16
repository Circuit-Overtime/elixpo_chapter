#!/usr/bin/env node
'use strict';

// Blocks Glob on code symbol patterns, suggests serena instead

const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (input.tool_name !== 'Glob') return process.exit(0);

    const pattern = (input.tool_input && input.tool_input.pattern) || '';

    // Pure extension globs are fine
    if (/^\*\*\/\*\.[a-z]+$/.test(pattern)) return process.exit(0);
    if (/^\*\.[a-z]+$/.test(pattern)) return process.exit(0);

    // Path-based globs are directory searches, not symbol searches — allow them
    // e.g., "docs/security/**/*", "src/auth/*.ts", "**/components/**"
    if (pattern.includes('/')) return process.exit(0);

    // Only block wildcard-wrapped symbols like "*UserService*" or "*handleAuth*"
    // These are clearly symbol searches, not directory searches
    const symbolMatch = pattern.match(/^\*+([A-Za-z][a-zA-Z0-9]+)\*+$/);
    if (!symbolMatch) return process.exit(0);

    const candidate = symbolMatch[1];
    const isCamelCase = /^[a-z][a-zA-Z0-9]{3,}$/.test(candidate) && /[A-Z]/.test(candidate);
    const isPascalCase = /^[A-Z][a-zA-Z][a-zA-Z0-9]{2,}$/.test(candidate);

    // Single PascalCase words that are common directory/concept names — allow
    const commonNames = /^(Security|Components|Services|Models|Types|Config|Utils|Hooks|Pages|Auth|Admin|Dashboard|Settings|Profile|Tests|Specs|Docs|Public|Static|Assets)$/;
    if (commonNames.test(candidate)) return process.exit(0);

    const symbols = (isCamelCase || isPascalCase) ? [candidate] : [];

    if (symbols.length === 0) return process.exit(0);

    const output = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Glob blocked: '${symbols.join(', ')}' looks like code symbol(s). Use mcp__serena__find_symbol with name_path_pattern='${symbols[0]}' instead. Glob is for file discovery by extension or directory, not symbol search.`,
        additionalContext: `Use serena find_symbol for symbol-based file discovery. For broad file patterns, use '**/*.ts' instead of symbol names in globs.`
      }
    };

    process.stdout.write(JSON.stringify(output) + '\n');
    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
