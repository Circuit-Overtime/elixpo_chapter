'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const CLAUDE_JSON = path.join(os.homedir(), '.claude.json');
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');
const BIN_DIR = path.join(CLAUDE_DIR, 'bin');
const HOOKS_DIR = path.join(CLAUDE_DIR, 'hooks');
const PKG_ROOT = path.resolve(__dirname, '..');

const C = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  blue: s => `\x1b[34m${s}\x1b[0m`,
  purple: s => `\x1b[35m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

const info    = msg => console.log(`  ${C.blue('[*]')} ${msg}`);
const success = msg => console.log(`  ${C.green('[+]')} ${msg}`);
const warn    = msg => console.log(`  ${C.yellow('[!]')} ${msg}`);
const error   = msg => console.log(`  ${C.red('[-]')} ${msg}`);

function ask(question) {
  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    return Promise.resolve(true);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`  ${C.cyan('[?]')} ${question} (y/n): `, answer => {
      rl.close();
      resolve(/^y/i.test(answer));
    });
  });
}

function readJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return {};
  }
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  const files = fs.readdirSync(src);
  let count = 0;
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
    count++;
  }
  return count;
}

module.exports = {
  CLAUDE_DIR, CLAUDE_JSON, SETTINGS, AGENTS_DIR, BIN_DIR, HOOKS_DIR, PKG_ROOT,
  C, info, success, warn, error, ask,
  readJSON, writeJSON, ensureDir, copyDir,
};
