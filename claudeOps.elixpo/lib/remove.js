'use strict';

const fs = require('fs');
const path = require('path');
const {
  CLAUDE_DIR, CLAUDE_JSON, SETTINGS, AGENTS_DIR, BIN_DIR, HOOKS_DIR,
  C, info, success, warn, ask,
  readJSON, writeJSON,
} = require('./utils');

const AGENT_FILES = [
  'architect', 'brancher', 'breaker', 'design-critic', 'fuzzer',
  'judge', 'prism', 'questioner', 'red-team', 'refiner',
  'researcher', 'specwriter', 'test-auditor', 'ui-architect', 'wirer',
];

const BIN_FILES = [
  'orphan.sh', 'wiring.sh', 'loopcheck.sh',
  'handover.sh', 'resume.sh', 'onboard.sh',
];

const HOOK_FILES = [
  'grep-guard.js', 'glob-guard.js', 'bash-guard.js',
];

const MCP_NAMES = [
  'jcodemunch', 'context-mode', '21st-dev-magic', 'shadcn',
  'magicui', 'animotion', 'aceternity', 'dembrandt', 'glance', 'docfork',
];

const HOOK_SIGNATURES = [
  'grep-guard', 'glob-guard', 'bash-guard',
  'orphan.sh', 'wiring.sh', 'loopcheck.sh',
  'handover.sh', 'resume.sh', 'onboard.sh',
  'cozempic', 'SECRET IN PROMPT', 'SECRET DETECTED',
  'Destructive command', '--no-verify is not allowed',
];

async function remove() {
  console.log('');
  console.log(C.purple(C.bold('  ============================================')));
  console.log(C.purple(C.bold('          ClaudeOps Uninstaller')));
  console.log(C.purple(C.bold('  ============================================')));
  console.log('');

  // Agents
  if (await ask('Remove ClaudeOps agents?')) {
    let count = 0;
    for (const name of AGENT_FILES) {
      const p = path.join(AGENTS_DIR, `${name}.md`);
      if (fs.existsSync(p)) { fs.unlinkSync(p); count++; }
    }
    success(`Removed ${count} agents`);
  }

  // CLAUDE.md
  if (await ask('Remove ClaudeOps CLAUDE.md?')) {
    const claudeMd = path.join(CLAUDE_DIR, 'CLAUDE.md');
    const backups = fs.existsSync(CLAUDE_DIR)
      ? fs.readdirSync(CLAUDE_DIR).filter(f => f.startsWith('CLAUDE.md.backup-')).sort().reverse()
      : [];
    if (backups.length > 0) {
      fs.copyFileSync(path.join(CLAUDE_DIR, backups[0]), claudeMd);
      success(`Restored CLAUDE.md from ${backups[0]}`);
    } else if (fs.existsSync(claudeMd)) {
      fs.unlinkSync(claudeMd);
      success('Removed CLAUDE.md (no backup found)');
    }
  }

  // Bin scripts
  if (await ask('Remove ClaudeOps bin scripts?')) {
    let count = 0;
    for (const name of BIN_FILES) {
      const p = path.join(BIN_DIR, name);
      if (fs.existsSync(p)) { fs.unlinkSync(p); count++; }
    }
    success(`Removed ${count} bin scripts`);
  }

  // Hook scripts
  if (await ask('Remove ClaudeOps hook scripts?')) {
    let count = 0;
    for (const name of HOOK_FILES) {
      const p = path.join(HOOKS_DIR, name);
      if (fs.existsSync(p)) { fs.unlinkSync(p); count++; }
    }
    success(`Removed ${count} hook scripts`);
  }

  // settings.json hooks
  if (await ask('Remove ClaudeOps hooks from settings.json?')) {
    if (fs.existsSync(SETTINGS)) {
      const settings = readJSON(SETTINGS);
      let removed = 0;
      if (settings.hooks) {
        for (const event of Object.keys(settings.hooks)) {
          const before = settings.hooks[event].length;
          settings.hooks[event] = settings.hooks[event].filter(entry => {
            const cmds = (entry.hooks || []).map(h => h.command || '');
            return !cmds.some(cmd => HOOK_SIGNATURES.some(sig => cmd.includes(sig)));
          });
          removed += before - settings.hooks[event].length;
          if (settings.hooks[event].length === 0) delete settings.hooks[event];
        }
        if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
      }
      // Remove plugins
      if (settings.enabledPlugins) {
        for (const key of Object.keys(settings.enabledPlugins)) {
          if (key.includes('claude-plugins-official')) {
            delete settings.enabledPlugins[key];
            removed++;
          }
        }
        if (Object.keys(settings.enabledPlugins).length === 0) delete settings.enabledPlugins;
      }
      writeJSON(SETTINGS, settings);
      success(`Removed ${removed} entries from settings.json`);
    }
  }

  // MCP servers
  if (await ask('Remove ClaudeOps MCP servers from ~/.claude.json?')) {
    if (fs.existsSync(CLAUDE_JSON)) {
      const data = readJSON(CLAUDE_JSON);
      let removed = 0;
      if (data.mcpServers) {
        for (const name of MCP_NAMES) {
          if (data.mcpServers[name]) { delete data.mcpServers[name]; removed++; }
        }
      }
      writeJSON(CLAUDE_JSON, data);
      success(`Removed ${removed} MCP servers`);
    }
  }

  console.log('');
  console.log(C.green(C.bold('  ============================================')));
  console.log(C.green(C.bold('           Uninstall Complete')));
  console.log(C.green(C.bold('  ============================================')));
  console.log('');
  success('Restart Claude Code to apply changes.');
  console.log('');
}

module.exports = { remove };
