#!/usr/bin/env node
// Apply pending D1 migrations from worker/migrations in order.
// Usage:  node scripts/db-migrate.mjs [--remote|--local]
//
// We can't use `wrangler d1 migrations apply` directly because there's no
// wrangler.toml at the repo root (D1 bindings live in next.config.mjs's
// setupDevPlatform call). This script tracks applied migrations in a
// `_migrations` table so re-running only applies new ones.

import { readdir, readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { writeFileSync, unlinkSync } from 'node:fs'

const args = new Set(process.argv.slice(2))
const flag = args.has('--local') ? '--local' : '--remote'
// --init: mark every existing migration file as applied without running
// it. Use this once on a database that already has migrations 0001..N
// applied manually, before adopting this tracker.
const INIT_MODE = args.has('--init')
const DB_NAME = 'lixsketch'
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'worker/migrations')

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: opts.capture ? ['inherit', 'pipe', 'inherit'] : 'inherit', shell: false })
    let out = ''
    if (opts.capture) child.stdout.on('data', (d) => { out += d.toString(); process.stdout.write(d) })
    child.on('exit', (code) => code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}`)))
    child.on('error', reject)
  })
}

async function execSQL(sql) {
  const tmp = path.join(tmpdir(), `lixsketch-migration-${Date.now()}.sql`)
  writeFileSync(tmp, sql, 'utf8')
  try {
    return await run('npx', ['wrangler', 'd1', 'execute', DB_NAME, flag, `--file=${tmp}`], { capture: true })
  } finally {
    try { unlinkSync(tmp) } catch {}
  }
}

async function execFile(filePath) {
  await run('npx', ['wrangler', 'd1', 'execute', DB_NAME, flag, `--file=${filePath}`])
}

// 1. Ensure history table exists.
await execSQL(`CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);`)

// 2. Read applied migrations.
const appliedOut = await execSQL(`SELECT name FROM _migrations;`)
const applied = new Set()
// wrangler prints results as JSON-ish text; pull out filename rows.
const m = appliedOut.match(/"name"\s*:\s*"([^"]+)"/g) || []
for (const line of m) {
  const v = line.match(/"name"\s*:\s*"([^"]+)"/)
  if (v) applied.add(v[1])
}

// 3. List migration files.
const files = (await readdir(MIGRATIONS_DIR))
  .filter((f) => f.endsWith('.sql'))
  .sort()

const pending = files.filter((f) => !applied.has(f))

// Safety check: if _migrations is empty AND `scenes` already exists, the
// caller probably ran migrations manually before adopting this tracker.
// Abort with a clear message instead of attempting non-idempotent
// ALTER TABLE statements.
if (!INIT_MODE && applied.size === 0) {
  const probe = await execSQL(`SELECT name FROM sqlite_master WHERE type='table' AND name='scenes';`)
  if (/"name"\s*:\s*"scenes"/.test(probe)) {
    console.error('\n✗ Schema already exists but _migrations history is empty.')
    console.error('  This usually means migrations were applied manually before this tracker was added.')
    console.error('  Run `npm run db:migrate -- --init` ONCE to seed history with every migration')
    console.error('  file marked as applied. Then re-run this command for any new pending migrations.\n')
    process.exit(1)
  }
}

if (INIT_MODE) {
  console.log(`Init mode: marking ${files.length} migration(s) as applied without running them.`)
  for (const f of files) {
    if (applied.has(f)) continue
    await execSQL(`INSERT INTO _migrations (name) VALUES ('${f.replace(/'/g, "''")}');`)
    console.log(`  ✓ ${f}`)
  }
  console.log(`✓ History seeded.`)
  process.exit(0)
}

if (!pending.length) {
  console.log(`✓ No pending migrations [${flag}].  ${applied.size} already applied.`)
  process.exit(0)
}

console.log(`Applying ${pending.length} pending migration(s) to D1 [${flag}]:`)
for (const f of pending) {
  console.log(`  → ${f}`)
  const full = path.join('worker/migrations', f)
  await execFile(full)
  await execSQL(`INSERT INTO _migrations (name) VALUES ('${f.replace(/'/g, "''")}');`)
}
console.log(`✓ Applied ${pending.length} migration(s).`)
