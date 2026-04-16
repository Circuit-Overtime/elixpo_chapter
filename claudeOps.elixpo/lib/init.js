'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  CLAUDE_DIR, CLAUDE_JSON, SETTINGS, AGENTS_DIR, BIN_DIR, HOOKS_DIR, PKG_ROOT,
  C, info, success, warn, error, ask,
  readJSON, writeJSON, ensureDir, copyDir,
} = require('./utils');

const AGENTS = [
  'architect', 'brancher', 'breaker', 'design-critic', 'fuzzer',
  'judge', 'prism', 'questioner', 'red-team', 'refiner',
  'researcher', 'specwriter', 'test-auditor', 'ui-architect', 'wirer',
];

async function init() {
  console.log('');
  console.log(C.purple(C.bold('  ============================================')));
  console.log(C.purple(C.bold('            ClaudeOps Installer')));
  console.log(C.purple(C.bold('  ============================================')));
  console.log('');
  console.log(`  ${C.cyan('15 agents | token pipeline | safety hooks')}`);
  console.log('');

  // ── Preflight ──────────────────────────────────────────
  try {
    const ver = execSync('claude --version 2>&1', { encoding: 'utf8' }).trim();
    success(`Claude Code: ${ver}`);
  } catch {
    error('Claude Code not found. Install it first: https://claude.ai/code');
    process.exit(1);
  }

  const skipMcp = process.argv.includes('--no-mcp');
  const skipPlugins = process.argv.includes('--no-plugins');
  const agentsOnly = process.argv.includes('--agents-only');

  // ── Step 1: Agents ─────────────────────────────────────
  console.log(`\n  ${C.bold('Step 1/5: Agents')}`);
  ensureDir(AGENTS_DIR);
  const agentsSrc = path.join(PKG_ROOT, 'agents');
  const count = copyDir(agentsSrc, AGENTS_DIR);
  success(`Installed ${count} agents`);

  if (agentsOnly) {
    printDone(count);
    return;
  }

  // ── Step 2: CLAUDE.md ──────────────────────────────────
  console.log(`\n  ${C.bold('Step 2/5: CLAUDE.md')}`);
  const claudeMd = path.join(CLAUDE_DIR, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) {
    const backup = `${claudeMd}.backup-${Date.now()}`;
    fs.copyFileSync(claudeMd, backup);
    warn(`Existing CLAUDE.md backed up to ${path.basename(backup)}`);
  }
  fs.copyFileSync(path.join(PKG_ROOT, 'config', 'CLAUDE.md.template'), claudeMd);
  success('CLAUDE.md installed');

  // ── Step 3: Hooks + bin scripts ────────────────────────
  console.log(`\n  ${C.bold('Step 3/5: Hooks & Scripts')}`);

  // Copy bin scripts
  ensureDir(BIN_DIR);
  const binCount = copyDir(path.join(PKG_ROOT, 'scripts'), BIN_DIR);

  // Make them executable
  for (const f of fs.readdirSync(BIN_DIR)) {
    try { fs.chmodSync(path.join(BIN_DIR, f), 0o755); } catch {}
  }
  success(`Installed ${binCount} bin scripts`);

  // Copy hook scripts (JS)
  ensureDir(HOOKS_DIR);
  const hookCount = copyDir(path.join(PKG_ROOT, 'hooks'), HOOKS_DIR);
  success(`Installed ${hookCount} hook scripts`);

  // Merge hooks into settings.json
  ensureDir(CLAUDE_DIR);
  if (!fs.existsSync(SETTINGS)) {
    writeJSON(SETTINGS, {});
  }

  const settings = readJSON(SETTINGS);
  const hooksTemplate = readJSON(path.join(PKG_ROOT, 'config', 'hooks.json'));
  const newHooks = hooksTemplate.hooks || {};

  if (!settings.hooks) settings.hooks = {};

  for (const [event, entries] of Object.entries(newHooks)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];
    const existing = new Set();
    for (const entry of settings.hooks[event]) {
      for (const h of (entry.hooks || [])) {
        existing.add(h.command || '');
      }
    }
    for (const newEntry of entries) {
      const isDup = (newEntry.hooks || []).some(h => existing.has(h.command || ''));
      if (!isDup) settings.hooks[event].push(newEntry);
    }
  }

  writeJSON(SETTINGS, settings);
  success('Hooks merged into settings.json');

  // ── Step 4: Plugins ────────────────────────────────────
  if (!skipPlugins) {
    console.log(`\n  ${C.bold('Step 4/5: Plugins')}`);
    const plugins = [
      'pyright-lsp@claude-plugins-official',
      'rust-analyzer-lsp@claude-plugins-official',
      'context7@claude-plugins-official',
      'superpowers@claude-plugins-official',
      'semgrep@claude-plugins-official',
      'code-review@claude-plugins-official',
    ];

    const s = readJSON(SETTINGS);
    if (!s.enabledPlugins) s.enabledPlugins = {};
    for (const p of plugins) s.enabledPlugins[p] = true;
    writeJSON(SETTINGS, s);
    success(`Enabled ${plugins.length} official plugins`);
  } else {
    console.log(`\n  ${C.bold('Step 4/5: Plugins')} ${C.yellow('(skipped)')}`);
  }

  // ── Step 5: MCP Servers ────────────────────────────────
  if (!skipMcp) {
    console.log(`\n  ${C.bold('Step 5/5: MCP Servers')}`);
    await installMcpServers();
  } else {
    console.log(`\n  ${C.bold('Step 5/5: MCP Servers')} ${C.yellow('(skipped)')}`);
  }

  printDone(count);
}

async function installMcpServers() {
  const claudeJson = readJSON(CLAUDE_JSON);
  if (!claudeJson.mcpServers) claudeJson.mcpServers = {};

  function addMcp(name, command, args, env) {
    if (claudeJson.mcpServers[name]) {
      info(`MCP already configured: ${name}`);
      return;
    }
    claudeJson.mcpServers[name] = { type: 'stdio', command, args, env: env || {} };
    success(`Added MCP: ${name}`);
  }

  // Core token-saving MCPs (auto-add)
  addMcp('context-mode', 'context-mode', []);
  addMcp('jcodemunch', 'jcodemunch-mcp', []);

  // Docfork
  if (process.platform === 'win32') {
    addMcp('docfork', 'cmd', ['/c', 'npx', '-y', 'docfork@latest']);
  } else {
    addMcp('docfork', 'npx', ['-y', 'docfork@latest']);
  }

  // UI/Design MCPs (ask before each)
  const uiMcps = [
    { name: '21st-dev-magic', q: '21st.dev Magic MCP? (AI component generation)', cmd: 'npx', args: ['-y', '@21st-dev/magic@latest'], env: { API_KEY: 'REPLACE_WITH_YOUR_21STDEV_API_KEY' } },
    { name: 'shadcn', q: 'shadcn/ui MCP? (official component registry)', cmd: 'npx', args: ['-y', 'mcp-remote', 'https://www.shadcn.io/api/mcp'] },
    { name: 'magicui', q: 'Magic UI MCP? (60+ animated components)', cmd: 'npx', args: ['-y', 'magicui-mcp'] },
    { name: 'animotion', q: 'Animotion MCP? (745 CSS animations + 9000 SVG icons)', cmd: 'npx', args: ['-y', 'animotion-mcp'] },
    { name: 'aceternity', q: 'Aceternity UI MCP? (200+ cinematic, 3D components)', cmd: 'npx', args: ['-y', 'aceternityui-mcp@latest'] },
    { name: 'glance', q: 'Glance MCP? (browser screenshots — Claude sees what it built)', cmd: 'npx', args: ['-y', 'glance-mcp'], env: { BROWSER_HEADLESS: 'true', BROWSER_LAZY: 'true' } },
  ];

  for (const mcp of uiMcps) {
    if (claudeJson.mcpServers[mcp.name]) {
      info(`MCP already configured: ${mcp.name}`);
      continue;
    }
    const yes = await ask(`Install ${mcp.q}`);
    if (yes) addMcp(mcp.name, mcp.cmd, mcp.args, mcp.env);
  }

  writeJSON(CLAUDE_JSON, claudeJson);

  // Optional tool installs
  console.log('');
  const tools = [
    { name: 'RTK', check: 'rtk', q: 'Install RTK? (CLI output compression, 60-90% savings)', install: 'cargo install --git https://github.com/rtk-ai/rtk' },
    { name: 'Context Mode', check: 'context-mode', q: 'Install Context Mode? (tool output sandboxing)', install: 'npm install -g context-mode' },
    { name: 'jCodeMunch', check: null, q: 'Install jCodeMunch? (code indexing, 95%+ savings)', install: 'pip install jcodemunch-mcp' },
    { name: 'Serena', check: 'serena', q: 'Install Serena? (LSP code navigation)', install: 'uv tool install -p 3.13 serena-agent@latest --prerelease=allow' },
  ];

  for (const tool of tools) {
    if (tool.check && hasCmd(tool.check)) {
      success(`${tool.name} already installed`);
      continue;
    }
    const yes = await ask(tool.q);
    if (yes) {
      try {
        info(`Installing ${tool.name}...`);
        execSync(tool.install, { stdio: 'pipe' });
        success(`${tool.name} installed`);
      } catch {
        warn(`Could not install ${tool.name} — install manually: ${tool.install}`);
      }
    }
  }
}

function hasCmd(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

function printDone(agentCount) {
  console.log('');
  console.log(C.green(C.bold('  ============================================')));
  console.log(C.green(C.bold('           Installation Complete!')));
  console.log(C.green(C.bold('  ============================================')));
  console.log('');
  success('Restart Claude Code to activate.');
  console.log('');
  info('To uninstall: claudeops remove');
  console.log('');
}

module.exports = { init };
