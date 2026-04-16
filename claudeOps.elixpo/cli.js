#!/usr/bin/env node
'use strict';

const { init } = require('./lib/init');
const { remove } = require('./lib/remove');
const { status } = require('./lib/status');

const command = process.argv[2];

const HELP = `
  ClaudeOps — optimization toolkit for Claude Code

  Usage:
    claudeops init       Install agents, hooks, and config
    claudeops remove     Uninstall everything cleanly
    claudeops status     Show what's currently installed
    claudeops help       Show this message

  Options:
    --yes, -y            Skip confirmation prompts (install everything)
    --no-mcp             Skip MCP server setup
    --no-plugins         Skip plugin activation
    --agents-only        Only install agents
`;

switch (command) {
  case 'init':
  case 'install':
    init().catch(err => { console.error(err); process.exit(1); });
    break;
  case 'remove':
  case 'uninstall':
    remove().catch(err => { console.error(err); process.exit(1); });
    break;
  case 'status':
    status();
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    console.log(HELP);
    break;
  default:
    console.error(`  Unknown command: ${command}`);
    console.log(HELP);
    process.exit(1);
}
