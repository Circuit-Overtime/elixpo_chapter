'use strict';

const fs = require('fs');
const path = require('path');
const {
  CLAUDE_DIR, CLAUDE_JSON, SETTINGS, AGENTS_DIR, BIN_DIR, HOOKS_DIR,
  C, info, success, warn,
  readJSON,
} = require('./utils');

const AGENT_FILES = [
  'architect', 'brancher', 'breaker', 'design-critic', 'fuzzer',
  'judge', 'prism', 'questioner', 'red-team', 'refiner',
  'researcher', 'specwriter', 'test-auditor', 'ui-architect', 'wirer',
];

function status() {
  console.log('');
  console.log(C.bold('  ClaudeOps Status'));
  console.log('  ─────────────────');
  console.log('');

  // Agents
  const installed = AGENT_FILES.filter(a => fs.existsSync(path.join(AGENTS_DIR, `${a}.md`)));
  const missing = AGENT_FILES.filter(a => !fs.existsSync(path.join(AGENTS_DIR, `${a}.md`)));
  if (installed.length === AGENT_FILES.length) {
    success(`Agents: ${installed.length}/${AGENT_FILES.length} installed`);
  } else {
    warn(`Agents: ${installed.length}/${AGENT_FILES.length} installed`);
    if (missing.length > 0) info(`  Missing: ${missing.join(', ')}`);
  }

  // CLAUDE.md
  const claudeMd = path.join(CLAUDE_DIR, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) {
    success('CLAUDE.md: installed');
  } else {
    warn('CLAUDE.md: not found');
  }

  // Hooks in settings.json
  if (fs.existsSync(SETTINGS)) {
    const settings = readJSON(SETTINGS);
    const hookCount = Object.values(settings.hooks || {}).reduce((sum, arr) => sum + arr.length, 0);
    success(`Hooks: ${hookCount} entries in settings.json`);
  } else {
    warn('settings.json: not found');
  }

  // MCP servers
  if (fs.existsSync(CLAUDE_JSON)) {
    const data = readJSON(CLAUDE_JSON);
    const mcpCount = Object.keys(data.mcpServers || {}).length;
    success(`MCP Servers: ${mcpCount} configured`);
  } else {
    warn('~/.claude.json: not found');
  }

  // Bin scripts
  const binFiles = ['orphan.sh', 'wiring.sh', 'loopcheck.sh', 'handover.sh', 'resume.sh', 'onboard.sh'];
  const binInstalled = binFiles.filter(f => fs.existsSync(path.join(BIN_DIR, f)));
  if (binInstalled.length === binFiles.length) {
    success(`Bin scripts: ${binInstalled.length}/${binFiles.length} installed`);
  } else {
    warn(`Bin scripts: ${binInstalled.length}/${binFiles.length} installed`);
  }

  // Hook scripts (JS)
  const hookFiles = ['grep-guard.js', 'glob-guard.js', 'bash-guard.js'];
  const hooksInstalled = hookFiles.filter(f => fs.existsSync(path.join(HOOKS_DIR, f)));
  if (hooksInstalled.length === hookFiles.length) {
    success(`Hook scripts: ${hooksInstalled.length}/${hookFiles.length} installed`);
  } else {
    warn(`Hook scripts: ${hooksInstalled.length}/${hookFiles.length} installed`);
  }

  console.log('');
}

module.exports = { status };
