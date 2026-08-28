#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { resolveConfig, ProfileRegistry, validateProfile } from '../src/config.js';
import { CredentialStore, validateKey } from '../src/credentials.js';
import { LixrlClient } from '../src/client.js';
import { emit, fail, EXIT_CODES } from '../src/contract.js';
import { openBrowser, promptSecret } from '../src/ui.js';

const VERSION = '1.0.1';
const OPTIONS = {
  profile: { type: 'string' },
  'api-url': { type: 'string' },
  json: { type: 'boolean', default: false },
  quiet: { type: 'boolean', default: false },
  'no-input': { type: 'boolean', default: false },
  open: { type: 'boolean', default: false },
  yes: { type: 'boolean', short: 'y', default: false },
  help: { type: 'boolean', short: 'h', default: false },
  version: { type: 'boolean', short: 'v', default: false },
};

const HELP = `lixrl — production CLI for Lixrl

Usage:
  lixrl login [--profile <name>] [--open]
  lixrl logout [--profile <name>] --yes
  lixrl whoami [--profile <name>] [--json]
  lixrl profiles [--json]
  lixrl use <profile> [--json]

Authentication:
  Create a read/write API key at https://lixrl.com/profile/keys. Login stores it
  in the OS keychain. For CI, set LIXRL_API_KEY instead of writing a credential.

Global flags:
  --profile <name>    select a stored account
  --api-url <url>     API origin (default: https://lixrl.com)
  --json              stable machine-readable output
  --no-input          never prompt
  --quiet             suppress ordinary output
  --yes, -y           confirm destructive operations
  --help, -h          show help
  --version, -v       show version
`;

async function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: false });
  const options = parsed.values;
  const [command, subcommand] = parsed.positionals;
  if (options.version) return process.stdout.write(`${VERSION}\n`);
  if (options.help || !command) return process.stdout.write(HELP);

  const config = resolveConfig({ options });
  const registry = new ProfileRegistry();
  const credentials = new CredentialStore();
  const profile = options.profile ? validateProfile(options.profile) : await registry.selected(config.profile);

  if (command === 'login') {
    if (options['no-input'] && !process.env.LIXRL_API_KEY) {
      throw Object.assign(new Error('LIXRL_API_KEY is required with --no-input.'), { code: 'login_required', exitCode: EXIT_CODES.AUTH });
    }
    if (options.open) openBrowser(`${config.apiUrl}/profile/keys`);
    const key = validateKey(process.env.LIXRL_API_KEY || await promptSecret());
    const user = await new LixrlClient({ apiUrl: config.apiUrl, apiKey: key }).me();
    if (!process.env.LIXRL_API_KEY) await credentials.set(profile, key);
    await registry.add(profile);
    return emit({ profile, user: { email: user.email, display_name: user.display_name, tier: user.tier } }, options);
  }

  if (command === 'profiles') {
    const state = await registry.read();
    return emit({ active: state.active, profiles: state.profiles }, options);
  }
  if (command === 'use') {
    if (!subcommand) throw Object.assign(new Error('Usage: lixrl use <profile>'), { exitCode: EXIT_CODES.USAGE });
    await registry.use(subcommand);
    return emit({ active: subcommand }, options);
  }

  const key = await credentials.get(profile);
  if (!key) throw Object.assign(new Error(`Profile "${profile}" is not logged in. Run lixrl login.`), { code: 'login_required', exitCode: EXIT_CODES.AUTH });

  if (command === 'logout') {
    if (!options.yes) throw Object.assign(new Error('Logging out requires --yes.'), { code: 'confirmation_required', exitCode: EXIT_CODES.CONFIRMATION });
    if (!process.env.LIXRL_API_KEY) await credentials.delete(profile);
    await registry.remove(profile);
    return emit({ loggedOut: true, profile }, options);
  }
  if (command === 'whoami') {
    const user = await new LixrlClient({ apiUrl: config.apiUrl, apiKey: key }).me();
    return emit({ profile, ...user }, options);
  }

  throw Object.assign(new Error(`Unknown command: ${command}`), { code: 'unknown_command', exitCode: EXIT_CODES.USAGE });
}

main().catch((error) => fail(error, (() => {
  try { return parseArgs({ args: process.argv.slice(2), options: OPTIONS, allowPositionals: true, strict: false }).values; }
  catch { return {}; }
})()));
