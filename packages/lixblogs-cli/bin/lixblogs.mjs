#!/usr/bin/env node

/**
 * bin/lixblogs.mjs — CLI entry point.
 *
 * Per maintainer direction: zero third-party dependencies for argument
 * parsing — uses Node's native util.parseArgs (built into Node 18+)
 * instead of commander/oclif/etc. UI/branding (panda welcome screen,
 * theming) is Divyanshu's territory later; this file only handles
 * parsing and dispatch, deliberately unstyled for now.
 *
 * Currently wires up `auth login|status|logout|revoke` only, per #137's
 * scope. Other command groups (blog, media, org, stats — see #135) are out
 * of scope for this issue and will be added in follow-up issues.
 *
 * Deliberately thin: all real logic lives in src/commands/**, this file
 * only parses args, resolves config, constructs dependencies via the
 * factories, and calls into the tested command functions. None of that
 * logic changed when swapping the parser out — this is exactly the
 * decoupling that made this swap fast.
 */

import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
import { resolveConfig } from "../src/config/config.js";
import { createAuthProvider } from "../src/config/providerFactory.js";
import { createCredentialStore } from "../src/config/credentialStoreFactory.js";
import { safeJsonStringify, redactErrorMessage } from "../src/config/redact.js";
import { authLogin } from "../src/commands/auth/login.js";
import { authStatus } from "../src/commands/auth/status.js";
import { authLogout } from "../src/commands/auth/logout.js";
import { authRevoke } from "../src/commands/auth/revoke.js";
import { authProfiles, authUse } from "../src/commands/auth/profiles.js";
import { ProfileRegistry, validateProfileId } from "../src/config/ProfileRegistry.js";

const OPTIONS = {
  profile: { type: "string" },
  env: { type: "string" },
  json: { type: "boolean", default: false },
  quiet: { type: "boolean", default: false },
  yes: { type: "boolean", short: "y", default: false },
  "allow-insecure-fallback": { type: "boolean", default: false },
  "auth-provider": { type: "string" },
  "accounts-url": { type: "string" },
  "api-url": { type: "string" },
  "client-id": { type: "string" },
  audience: { type: "string" },
  scope: { type: "string", multiple: true },
  open: { type: "boolean", default: false },
  help: { type: "boolean", short: "h", default: false },
};

const HELP_TEXT = `lixblogs — LixBlogs CLI

Usage:
  lixblogs auth login    [--profile <name>] [--env <environment>] [--json] [--quiet] [--allow-insecure-fallback]
  lixblogs auth status   [--profile <name>] [--json]
  lixblogs auth logout   [--profile <name>] [--json] [--quiet]
  lixblogs auth revoke   [--profile <name>] [--json] [--quiet] --yes
  lixblogs auth profiles [--json]
  lixblogs auth use <name> [--json]

Global flags:
  --profile <name>            named profile to use (default: "default")
  --env <environment>         override environment (development|staging|production)
  --auth-provider <provider>  elixpo, or mock in development/test only
  --accounts-url <url>        override the Accounts discovery origin
  --api-url <url>             LixBlogs API origin (default: https://blogs.elixpo.com)
  --scope <scope>             request an OAuth scope (repeatable)
  --open                      open the complete device verification URL
  --json                      machine-readable JSON output
  --quiet                     suppress non-essential output
  --yes, -y                   auto-confirm destructive actions (required for revoke)
  --allow-insecure-fallback   explicit opt-in: if the OS keychain is unavailable, use a
                               non-persistent in-memory store instead of failing
  --help, -h                  show this help

Note: interactive confirmation prompting is not implemented yet (CLI-shell/UX
work, a later issue) — destructive actions require --yes explicitly, always.
`;

const DEFAULT_SCOPES = [
  "openid", "profile", "email",
  "lixblogs:profile:read", "lixblogs:profile:write",
  "lixblogs:blog:read", "lixblogs:blog:write", "lixblogs:blog:publish", "lixblogs:blog:delete",
  "lixblogs:media:read", "lixblogs:media:write",
  "lixblogs:organizations:read", "lixblogs:organizations:write",
  "lixblogs:collaboration:read", "lixblogs:collaboration:write",
  "lixblogs:analytics:read", "lixblogs:notifications:read",
];

function configFlags(opts) {
  return {
    profile: opts.profile,
    env: opts.env,
    authProvider: opts["auth-provider"],
    accountsUrl: opts["accounts-url"],
    apiUrl: opts["api-url"],
    clientId: opts["client-id"],
    audience: opts.audience,
  };
}

async function selectedProfile(config, registry) {
  if (config.profileExplicit) return validateProfileId(config.profile);
  return (await registry.getActive()) || validateProfileId(config.profile);
}

async function openBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}

function output(opts, data) {
  if (opts.json) {
    process.stdout.write(safeJsonStringify(data) + "\n");
  }
}

function fail(opts, message, exitCode = 1) {
  const safeMessage = redactErrorMessage(message);
  if (opts.json) {
    process.stdout.write(safeJsonStringify({ ok: false, error: safeMessage }) + "\n");
  } else if (!opts.quiet) {
    process.stderr.write(`Error: ${safeMessage}\n`);
  }
  process.exitCode = exitCode;
}

/**
 * Shared helper: constructs the credential store, surfacing a
 * CredentialStoreUnavailableError as a clean CLI-level failure (via fail())
 * rather than an uncaught stack trace, and pointing the user at
 * --allow-insecure-fallback if they haven't already opted in.
 * @returns {Promise<import("../src/config/CredentialStore.js").CredentialStore | null>}
 *   null if construction failed and fail() was already called.
 */
async function getCredentialStoreOrFail(opts, profileRegistry) {
  try {
    return await createCredentialStore({
      allowInsecureFallback: opts["allow-insecure-fallback"],
      profileRegistry,
    });
  } catch (err) {
    fail(
      opts,
      `${err.message}${opts["allow-insecure-fallback"] ? "" : " Re-run with --allow-insecure-fallback to opt in to non-persistent storage instead."}`
    );
    return null;
  }
}

async function runLogin(opts) {
  const config = resolveConfig({ flags: configFlags(opts) });
  const profileRegistry = new ProfileRegistry();
  const profileId = await selectedProfile(config, profileRegistry);

  let provider;
  try {
    provider = createAuthProvider(config);
  } catch (err) {
    return fail(opts, err.message);
  }

  const credentialStore = await getCredentialStoreOrFail(opts, profileRegistry);
  if (!credentialStore) return;

  const result = await authLogin({
    provider,
    credentialStore,
    profileId,
    scopes: opts.scope?.length ? opts.scope : DEFAULT_SCOPES,
    openBrowser: opts.open ? openBrowser : undefined,
    onStatus: (status) => {
      if (opts.json) {
        output(opts, { event: status.type, ...status });
        return;
      }
      if (opts.quiet) return;
      if (status.type === "verification_pending") {
        console.log(`To log in, visit: ${status.verificationUriComplete || status.verificationUri}`);
        console.log(`Enter code: ${status.userCode}`);
        console.log(`(expires in ${status.expiresInSeconds}s)`);
      } else if (status.type === "pending") {
        console.log("Waiting for approval...");
      } else if (status.type === "slow_down") {
        console.log("Slowing down polling as requested by the server...");
      } else if (status.type === "approved") {
        console.log("Login approved.");
      } else if (status.type === "denied") {
        console.log("Login was denied.");
      } else if (status.type === "expired") {
        console.log("Device code expired.");
      }
    },
  });

  if (!result.ok) {
    return fail(opts, result.reason);
  }
  await profileRegistry.setActive(result.profileId);
  output(opts, { ok: true, profile: result.profileId });
  if (!opts.json && !opts.quiet) {
    console.log(`Logged in as profile "${result.profileId}".`);
  }
}

async function runStatus(opts) {
  const config = resolveConfig({ flags: configFlags(opts) });
  const profileRegistry = new ProfileRegistry();
  const profileId = await selectedProfile(config, profileRegistry);
  const credentialStore = await getCredentialStoreOrFail(opts, profileRegistry);
  if (!credentialStore) return;

  const result = await authStatus({ credentialStore, profileId });

  output(opts, result);
  if (!opts.json) {
    for (const entry of result) {
      if (!entry.loggedIn) {
        console.log(`${entry.profileId}: not logged in`);
      } else {
        console.log(
          `${entry.profileId}: logged in${entry.expired ? " (expired)" : ""} — scopes: ${entry.scopes.join(", ")}`
        );
      }
    }
  }
}

async function runLogout(opts) {
  const config = resolveConfig({ flags: configFlags(opts) });
  const profileRegistry = new ProfileRegistry();
  const profileId = await selectedProfile(config, profileRegistry);
  const credentialStore = await getCredentialStoreOrFail(opts, profileRegistry);
  if (!credentialStore) return;

  const result = await authLogout({ credentialStore, profileId });
  output(opts, result);
  if (!opts.json && !opts.quiet) {
    console.log(`Logged out profile "${profileId}".`);
  }
}

async function runRevoke(opts) {
  const config = resolveConfig({ flags: configFlags(opts) });
  const profileRegistry = new ProfileRegistry();
  const profileId = await selectedProfile(config, profileRegistry);

  // Destructive action: per #135, cannot run accidentally in a
  // non-interactive session. Interactive confirmation prompting is
  // CLI-shell/UX work (later issue) — for now, --yes is the only
  // supported path, and omitting it fails closed rather than silently
  // proceeding or silently doing nothing.
  if (!opts.yes) {
    return fail(
      opts,
      "This is a destructive action. Re-run with --yes to confirm (interactive confirmation prompt not yet implemented)."
    );
  }

  let provider;
  try {
    provider = createAuthProvider(config);
  } catch (err) {
    return fail(opts, err.message);
  }
  const credentialStore = await getCredentialStoreOrFail(opts, profileRegistry);
  if (!credentialStore) return;

  const result = await authRevoke({
    provider,
    credentialStore,
    profileId,
    confirmed: true,
  });

  if (!result.ok) {
    return fail(opts, result.reason);
  }
  output(opts, result);
  if (!opts.json && !opts.quiet) {
    console.log(`Revoked and logged out profile "${profileId}".`);
  }
}

async function runProfiles(opts) {
  const profileRegistry = new ProfileRegistry();
  const credentialStore = await getCredentialStoreOrFail(opts, profileRegistry);
  if (!credentialStore) return;
  const result = await authProfiles({ credentialStore, profileRegistry });
  output(opts, result);
  if (!opts.json) {
    if (!result.profiles.length) console.log("No profiles. Run `lixblogs auth login` first.");
    for (const profile of result.profiles) {
      console.log(`${profile.active ? "*" : " "} ${profile.profileId}${profile.expired ? " (expired)" : ""}`);
    }
  }
}

async function runUse(opts, args) {
  let profileId;
  try {
    profileId = validateProfileId(args[0]);
  } catch (error) {
    return fail(opts, error.message);
  }
  const profileRegistry = new ProfileRegistry();
  const credentialStore = await getCredentialStoreOrFail(opts, profileRegistry);
  if (!credentialStore) return;
  const result = await authUse({ credentialStore, profileRegistry, profileId });
  if (!result.ok) return fail(opts, result.reason);
  output(opts, result);
  if (!opts.json && !opts.quiet) console.log(`Using profile "${profileId}".`);
}

const ROUTES = {
  auth: {
    login: runLogin,
    status: runStatus,
    logout: runLogout,
    revoke: runRevoke,
    profiles: runProfiles,
    use: runUse,
  },
};

async function main() {
  let values, positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    }));
  } catch (err) {
    // strict: true makes parseArgs throw ERR_PARSE_ARGS_UNKNOWN_OPTION for
    // unrecognized flags rather than silently ignoring them — surface that
    // clearly instead of an unhandled exception.
    process.stderr.write(`Error: Invalid flag. ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  const [category, action] = positionals;
  const categoryRoutes = ROUTES[category];

  if (!categoryRoutes) {
    process.stderr.write(`Error: Unknown command category "${category}".\n`);
    process.stderr.write(`Available categories: ${Object.keys(ROUTES).join(", ")}\n`);
    process.exitCode = 1;
    return;
  }

  const handler = categoryRoutes[action];
  if (!handler) {
    process.stderr.write(`Error: Unknown ${category} command "${action}".\n`);
    process.stderr.write(
      `Available commands: ${Object.keys(categoryRoutes)
        .map((a) => `${category} ${a}`)
        .join(", ")}\n`
    );
    process.exitCode = 1;
    return;
  }

  await handler(values, positionals.slice(2));
}

main();
