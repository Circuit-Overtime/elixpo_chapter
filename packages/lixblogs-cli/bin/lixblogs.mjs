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
import { profileAliasFromIdentity } from "../src/commands/auth/profileAlias.js";
import { ProfileRegistry, validateProfileId } from "../src/config/ProfileRegistry.js";
import { AuthenticatedClient } from "../src/auth/AuthenticatedClient.js";
import { BlogClient, BlogApiError } from "../src/api/BlogClient.js";
import { OrgClient } from "../src/api/OrgClient.js";
import { CollaborationClient } from "../src/api/CollaborationClient.js";
import { AnalyticsClient } from "../src/api/AnalyticsClient.js";
import { IntegrationsClient } from "../src/api/IntegrationsClient.js";
import { MediaClient } from "../src/api/MediaClient.js";
import { EXIT_CODES, errorEnvelope, normalizeCommand } from "../src/cli/contract.js";
import { colorEnabled, listenForEnter, loginChallenge, successLine } from "../src/cli/ui.js";
import {
  blogCreate,
  blogDelete,
  blogEdit,
  blogGet,
  blogHistory,
  blogList,
  blogPublish,
  blogRestore,
  blogRestoreVersion,
  blogUnpublish,
} from "../src/commands/blog/index.js";
import {
  orgCollections,
  orgGet,
  orgList,
  orgMembers,
  orgTargets,
} from "../src/commands/org/index.js";
import {
  collabAccept,
  collabDecline,
  collabInvitations,
  collabInvite,
  collabList,
  collabRemove,
  collabRole,
} from "../src/commands/collab/index.js";
import { skillInspect, skillInstall, skillList } from "../src/commands/skill/index.js";
import { analyticsExport, analyticsQuery } from "../src/commands/analytics/index.js";
import { cloudinaryDisconnect } from "../src/commands/integrations/cloudinary-disconnect.js";
import { cloudinaryStatus } from "../src/commands/integrations/cloudinary-status.js";
import { mediaDelete, mediaGenerate, mediaUpload } from "../src/commands/media/index.js";
import { commentAdd, commentDelete, commentList, commentReply } from "../src/commands/comment/index.js";


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
  status: { type: "string" },
  limit: { type: "string" },
  cursor: { type: "string" },
  range: { type: "string" },
  from: { type: "string" },
  to: { type: "string" },
  dimension: { type: "string" },
  format: { type: "string" },
  output: { type: "string" },
  file: { type: "string" },
  stdin: { type: "boolean", default: false },
  content: { type: "string" },
  editor: { type: "boolean", default: false },
  title: { type: "string" },
  subtitle: { type: "string" },
  slug: { type: "string" },
  tag: { type: "string", multiple: true },
  emoji: { type: "string" },
  publication: { type: "string" },
  collection: { type: "string" },
  cover: { type: "string" },
  "member-only": { type: "boolean", default: false },
  "no-member-only": { type: "boolean", default: false },
  secret: { type: "boolean", default: false },
  "not-secret": { type: "boolean", default: false },
  "dry-run": { type: "boolean", default: false },
  "no-input": { type: "boolean", default: false },
  etag: { type: "string" },
  permanent: { type: "boolean", default: false },
  "idempotency-key": { type: "string" },
  user: { type: "string" },
  role: { type: "string" },
  "hide-on-profile": { type: "boolean", default: false },
  target: { type: "string" },
  force: { type: "boolean", default: false },
  prompt: { type: "string" },
  reference: { type: "string" },
  model: { type: "string" },
  seed: { type: "string" },
  width: { type: "string" },
  height: { type: "string" },
  blog: { type: "string" },
  type: { type: "string" },
  attach: { type: "boolean", default: false },
  caption: { type: "string" },
  "upload-id": { type: "string" },
  version: { type: "string" },
  parent: { type: "string" },
  comment: { type: "string" },
  "allow-comments": { type: "boolean", default: false },
  "no-comments": { type: "boolean", default: false },
  "cover-x": { type: "string" },
  "cover-y": { type: "string" },
  "cover-zoom": { type: "string" },
  help: { type: "boolean", short: "h", default: false },
};

const HELP_TEXT = `lixblogs — LixBlogs CLI

Usage:
  lixblogs login         [--profile <name>] [--open]
  lixblogs register      [--profile <name>] [--open]
  lixblogs logout        [--profile <name>]
  lixblogs whoami        [--profile <name>] [--json]
  lixblogs profiles      [--json]
  lixblogs use <name>    [--json]
  lixblogs auth login    [--profile <name>] [--env <environment>] [--json] [--quiet] [--allow-insecure-fallback]
  lixblogs auth status   [--profile <name>] [--json]
  lixblogs auth logout   [--profile <name>] [--json] [--quiet]
  lixblogs auth revoke   [--profile <name>] [--json] [--quiet] --yes
  lixblogs auth profiles [--json]
  lixblogs auth use <name> [--json]
  lixblogs blog list      [--status <status>] [--limit <n>] [--cursor <cursor>] [--json]
  lixblogs blog get <id>  [--json]
  lixblogs blog preview <id> [--json]
  lixblogs blog create    [--file <post.md>|--stdin|--content <markdown>|--editor] [metadata]
  lixblogs blog edit <id> [--file <post.md>|--stdin|--content <markdown>|--editor] [metadata]
  lixblogs blog publish <id> --yes [--dry-run] [--json]
  lixblogs blog unpublish <id> --yes [--dry-run] [--json]
  lixblogs blog delete <id> --yes [--permanent] [--dry-run] [--json]
  lixblogs blog trash <id> --yes [--dry-run] [--json]
  lixblogs blog restore <id> --yes [--dry-run] [--json]
  lixblogs blog history <id> [--json]
  lixblogs blog restore-version <id> --version <version-id> --yes [--json]
  lixblogs comment list <blog-id> [--json]
  lixblogs comment add <blog-id> --content <text> [--json]
  lixblogs comment reply <blog-id> --parent <comment-id> --content <text> [--json]
  lixblogs comment delete <blog-id> --comment <comment-id> --yes [--json]
  lixblogs org list          [--json]
  lixblogs org get <id>      [--json]
  lixblogs org collections <id> [--json]
  lixblogs org members <id>  [--json]
  lixblogs org targets       [--json]
  lixblogs collab list <blog-id> [--json]
  lixblogs collab invitations   [--json]
  lixblogs collab invite <blog-id> --user <username> --role <viewer|editor|admin> --yes
  lixblogs collab role <blog-id> --user <username-or-id> --role <viewer|editor|admin> --yes
  lixblogs collab remove <blog-id> [--user <username-or-id>] --yes
  lixblogs collab accept <blog-id> --yes [--hide-on-profile]
  lixblogs collab decline <blog-id> --yes
  lixblogs analytics query [--scope personal|org:<id>] [--range 30d] [--dimension overview]
  lixblogs analytics export --output <file> [--format json|csv] [query options]
  lixblogs integrations cloudinary-status [--json]
  lixblogs integrations cloudinary-disconnect --yes [--json]
  lixblogs integrations pollinations-status [--json]
  lixblogs integrations pollinations-disconnect --yes [--json]
  lixblogs media generate --prompt <text> [--model flux] [--reference <image>] [--blog <id> --type inline|cover --attach] [--output <file>]
  lixblogs media upload --file <image> --blog <id> [--type inline|cover] [--attach]
  lixblogs media delete <media-id> --yes [--json]
  lixblogs skill list             [--json]
  lixblogs skill inspect <name>   [--json]
  lixblogs skill install <name>   [--target <directory>] [--dry-run] --yes
  lixblogs disconnect cloudinary --yes
  lixblogs disconnect pollinations

Global flags:
  --profile <name>            local account alias (defaults to the signed-in username)
  --env <environment>         override environment (development|staging|production)
  --auth-provider <provider>  elixpo, or mock in development/test only
  --accounts-url <url>        override the Accounts discovery origin
  --api-url <url>             LixBlogs API origin (default: https://blogs.elixpo.com)
  --scope <scope>             request an OAuth scope (repeatable)
  --file <path>               read blog Markdown from a file
  --stdin                     read blog Markdown from stdin
  --content <markdown>        use inline Markdown
  --editor                    open the current blog in $EDITOR
  --title/--subtitle/--slug   update blog metadata
  --tag <tag>                 set a tag (repeatable, up to five)
  --publication <target>      personal or org:<id>
  --collection <id>           organization collection ID
  --dry-run                   validate and show the intended action without writing
  --permanent                 permanently delete instead of moving to trash
  --open                      open the device verification URL immediately
  --json                      machine-readable JSON output
  --quiet                     suppress non-essential output
  --yes, -y                   auto-confirm destructive actions (required for revoke)
  --allow-insecure-fallback   explicit opt-in: if the OS keychain is unavailable, use a
                               non-persistent in-memory store instead of failing
  --help, -h                  show this help

Machine mode:
  --json --no-input produces stable JSON on stdout, diagnostics on stderr, and
  never prompts. Publishing and destructive state changes require --yes.
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
  child.on("error", () => {});
  child.unref();
}

function output(opts, data) {
  if (opts.json) {
    process.stdout.write(safeJsonStringify(data) + "\n");
  }
}

function fail(opts, error, exitCode = EXIT_CODES.ERROR) {
  const value = error && typeof error === 'object' ? error : { message: String(error) };
  const safeMessage = redactErrorMessage(value.message);
  const envelope = errorEnvelope({ ...value, message: safeMessage });
  if (opts.json) {
    process.stdout.write(safeJsonStringify(envelope) + "\n");
  } else if (!opts.quiet) {
    process.stderr.write(`Error: ${safeMessage}\n`);
    if (value.hint) process.stderr.write(`Hint: ${value.hint}\n`);
    if (value.requestId) process.stderr.write(`Request: ${value.requestId}\n`);
  }
  process.exitCode = value.exitCode || exitCode;
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
  const requestedProfileId = validateProfileId(config.profile);
  const scopes = opts.scope?.length ? [...opts.scope] : [...DEFAULT_SCOPES];
  if (!config.profileExplicit && !scopes.includes("lixblogs:profile:read")) {
    scopes.push("lixblogs:profile:read");
  }

  let provider;
  try {
    provider = createAuthProvider(config);
  } catch (err) {
    return fail(opts, err.message);
  }

  const credentialStore = await getCredentialStoreOrFail(opts, profileRegistry);
  if (!credentialStore) return;

  let stopEnterListener = () => {};
  let result;
  try {
    result = await authLogin({
      provider,
      credentialStore,
      profileId: requestedProfileId,
      scopes,
      openBrowser: opts.open ? openBrowser : undefined,
      resolveProfileId: config.profileExplicit
        ? undefined
        : ({ accessToken }) => profileAliasFromIdentity({
            accessToken,
            apiBaseUrl: config.apiBaseUrl,
          }),
      onStatus: (status) => {
        if (opts.json) {
          if (status.type !== "pending") output(opts, { event: status.type, ...status });
          return;
        }
        if (opts.quiet) return;
        if (status.type === "verification_pending") {
          const url = status.verificationUriComplete || status.verificationUri;
          const interactive = Boolean(process.stdin.isTTY) && !opts["no-input"];
          process.stdout.write(loginChallenge({
            url,
            code: status.userCode,
            expiresInSeconds: status.expiresInSeconds,
            profile: config.profileExplicit ? requestedProfileId : null,
            interactive,
            color: colorEnabled(),
          }));
          if (interactive && !opts.open) {
            stopEnterListener = listenForEnter({ input: process.stdin, open: openBrowser, url });
          }
        } else if (status.type === "approved") {
          console.log(successLine("Access approved by Elixpo Accounts.", colorEnabled()));
        } else if (status.type === "denied") {
          console.log("  Access denied.");
        } else if (status.type === "expired") {
          console.log("  Device code expired.");
        }
      },
    });
  } finally {
    stopEnterListener();
  }

  if (!result.ok) {
    return fail(opts, result.reason);
  }
  await profileRegistry.add(result.profileId);
  await profileRegistry.setActive(result.profileId);
  output(opts, { ok: true, profile: result.profileId });
  if (!opts.json && !opts.quiet) {
    console.log(`  Credentials saved to local profile "${result.profileId}".`);
    console.log("  Tip: add another account with `lixblogs login`, list accounts with `lixblogs profiles`,");
    console.log("       and switch with `lixblogs use <username>`.");
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

async function authenticatedBlogClient(opts) {
  const config = resolveConfig({ flags: configFlags(opts) });
  const profileRegistry = new ProfileRegistry();
  const profileId = await selectedProfile(config, profileRegistry);
  const credentialStore = await getCredentialStoreOrFail(opts, profileRegistry);
  if (!credentialStore) return null;
  let provider;
  try { provider = createAuthProvider(config); } catch (error) { fail(opts, error); return null; }
  const http = new AuthenticatedClient({ provider, credentialStore, profileId, apiBaseUrl: config.apiBaseUrl });
  return { client: new BlogClient(http), http, config, credentialStore, profileId };
}

async function runWhoami(opts) {
  const context = await authenticatedBlogClient(opts);
  if (!context) return;
  try {
    const [identity, credentials] = await Promise.all([
      context.client.whoami(),
      context.credentialStore.get(context.profileId),
    ]);
    const result = {
      ok: true,
      profile: context.profileId,
      environment: context.config.environment,
      identity,
      scopes: credentials?.scopes || [],
      expiresAt: credentials?.expiresAt ? new Date(credentials.expiresAt).toISOString() : null,
      expired: credentials ? Date.now() >= credentials.expiresAt : true,
    };
    output(opts, result);
    if (!opts.json && !opts.quiet) {
      console.log(`${identity.displayName || identity.username} (@${identity.username})`);
      console.log(`Profile: ${context.profileId} · ${result.environment}`);
      console.log(`Scopes: ${result.scopes.join(', ') || 'none'}`);
      console.log(`Expires: ${result.expiresAt || 'unknown'}`);
    }
  } catch (error) {
    fail(opts, error, error.status === 401 || error.status === 403 ? EXIT_CODES.AUTH : EXIT_CODES.ERROR);
  }
}

async function runRegister(opts) {
  const config = resolveConfig({ flags: configFlags(opts) });
  const registrationUrl = new URL('/register', config.accountsBaseUrl).toString();
  if (opts['no-input']) {
    output(opts, { ok: true, registrationUrl, next: 'lixblogs login' });
    if (!opts.json && !opts.quiet) console.log(registrationUrl);
    return;
  }
  await openBrowser(registrationUrl);
  if (!opts.quiet) console.log(`Create your account at ${registrationUrl}, then approve the device login.`);
  await runLogin(opts);
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
async function runIntegrations(opts, args, action) {
  const config = resolveConfig({ flags: configFlags(opts) });
  const profileRegistry = new ProfileRegistry();
  const profileId = await selectedProfile(config, profileRegistry);

  if ((action === 'cloudinary-disconnect' || action === 'pollinations-disconnect') && !opts.yes) {
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

  const http = new AuthenticatedClient({
    provider, credentialStore, profileId, apiBaseUrl: config.apiBaseUrl,
  });
  const integrationsClient = new IntegrationsClient(http);

  let result;
  if (action === 'cloudinary-status') result = await cloudinaryStatus({ integrationsClient });
  else if (action === 'cloudinary-disconnect') result = await cloudinaryDisconnect({ integrationsClient, confirmed: true });
  else {
    try {
      result = { ok: true, data: action === 'pollinations-status'
        ? await integrationsClient.pollinationsStatus({ refresh: opts.force })
        : await integrationsClient.pollinationsDisconnect() };
    } catch (error) { result = { ok: false, error }; }
  }

  if (!result.ok) return fail(opts, result.error || result.reason);
  output(opts, result);
  if (!opts.json && !opts.quiet) {
    if (action === 'cloudinary-status') console.log(`Cloudinary: ${result.data.connected ? `connected (${result.data.cloudName})` : 'not connected'}`);
    else if (action === 'pollinations-status') console.log(`Pollinations: ${result.data.connected ? `connected${result.data.handle ? ` as ${result.data.handle}` : ''} · ${result.data.balance ?? 'unknown'} Pollen` : `${result.data.status}. Connect at ${result.data.connectUrl || 'https://blogs.elixpo.com/settings?tab=integrations'}`}`);
    else console.log(`${action.startsWith('pollinations') ? 'Pollinations' : 'Cloudinary'} connection disconnected.`);
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

const BLOG_COMMANDS = {
  list: blogList,
  get: blogGet,
  preview: blogGet,
  create: blogCreate,
  edit: blogEdit,
  publish: blogPublish,
  unpublish: blogUnpublish,
  delete: blogDelete,
  trash: blogDelete,
  restore: blogRestore,
  history: blogHistory,
  'restore-version': blogRestoreVersion,
};

const ORG_COMMANDS = {
  list: orgList,
  get: orgGet,
  collections: orgCollections,
  members: orgMembers,
  targets: orgTargets,
};

const COLLAB_COMMANDS = {
  list: collabList,
  invitations: collabInvitations,
  invite: collabInvite,
  role: collabRole,
  remove: collabRemove,
  accept: collabAccept,
  decline: collabDecline,
};

const SKILL_COMMANDS = {
  list: ({ options }) => skillList(options),
  inspect: ({ id }) => skillInspect({ name: id }),
  install: ({ id, options }) => skillInstall({ name: id, options }),
};

const ANALYTICS_COMMANDS = {
  query: analyticsQuery,
  export: analyticsExport,
};

const MEDIA_COMMANDS = { generate: mediaGenerate, upload: mediaUpload, delete: mediaDelete };
const COMMENT_COMMANDS = { list: commentList, add: commentAdd, reply: commentReply, delete: commentDelete };

async function runBlog(opts, args, action) {
  const config = resolveConfig({ flags: configFlags(opts) });
  const profileRegistry = new ProfileRegistry();
  const profileId = await selectedProfile(config, profileRegistry);
  const credentialStore = await getCredentialStoreOrFail(opts, profileRegistry);
  if (!credentialStore) return;
  let provider;
  try { provider = createAuthProvider(config); } catch (error) { return fail(opts, error.message); }
  const http = new AuthenticatedClient({
    provider, credentialStore, profileId, apiBaseUrl: config.apiBaseUrl,
  });
  const client = new BlogClient(http);
  const normalized = {
    ...opts,
    limit: opts.limit === undefined ? undefined : Number.parseInt(opts.limit, 10),
  };
  try {
    const result = await BLOG_COMMANDS[action]({
      client, id: args[0], options: normalized, stdin: process.stdin,
    });
    output(opts, { ok: true, ...result });
    if (!opts.json && !opts.quiet) {
      if (action === 'list') {
        for (const blog of result.data || []) console.log(`${blog.id}\t${blog.status}\t${blog.title || '(untitled)'}`);
        if (result.meta?.nextCursor) console.log(`Next cursor: ${result.meta.nextCursor}`);
      } else if (action === 'get') {
        console.log(`${result.title || '(untitled)'} [${result.status}]\n${result.markdown || ''}`);
      } else if (action === 'history') {
        for (const version of result.data || []) console.log(`${version.id}\t${version.label || 'snapshot'}\t${version.created_at}\t${version.username || 'system'}`);
      } else if (result.dryRun) {
        console.log(`Dry run: ${action} validated; no changes sent.`);
      } else {
        console.log(result.url || `${action} completed for ${result.id}.`);
      }
    }
  } catch (error) {
    if (opts.json && error instanceof BlogApiError) {
      process.stdout.write(safeJsonStringify({
        ok: false,
        error: { code: error.code, message: error.message, requestId: error.requestId, details: error.details },
      }) + '\n');
      process.exitCode = error.status === 412 ? 3 : 1;
      return;
    }
    return fail(opts, error, error.status === 412 ? EXIT_CODES.CONFLICT : EXIT_CODES.ERROR);
  }
}

async function runOrg(opts, args, action) {
  const context = await authenticatedBlogClient(opts);
  if (!context) return;
  const client = new OrgClient(context.http);
  try {
    const result = await ORG_COMMANDS[action]({ client, id: args[0], options: opts });
    output(opts, { ok: true, data: result });
    if (opts.json || opts.quiet) return;
    if (action === 'targets') {
      console.log('personal\tPersonal Blog');
      for (const org of result.organizations || []) {
        console.log(`${org.target}\t${org.role}\t${org.name}`);
        for (const collection of org.collections || []) {
          console.log(`  collection:${collection.id}\t${collection.name}`);
        }
      }
      return;
    }
    const rows = action === 'list' ? result.data || [] : Array.isArray(result) ? result : [result];
    for (const row of rows) {
      console.log([
        row.id || row.userId || row.orgId,
        row.role,
        row.slug || row.username,
        row.name || row.displayName,
      ].filter(Boolean).join('\t'));
    }
  } catch (error) {
    fail(opts, error, error.status === 401 || error.status === 403 ? EXIT_CODES.AUTH : EXIT_CODES.ERROR);
  }
}

async function runMedia(opts, args, action) {
  const context = await authenticatedBlogClient(opts);
  if (!context) return;
  try {
    const result = await MEDIA_COMMANDS[action]({
      mediaClient: new MediaClient(context.http), blogClient: context.client, id: args[0], options: opts,
    });
    output(opts, { ok: true, data: result });
    if (!opts.json && !opts.quiet) {
      if (action === 'delete') console.log(`Deleted media ${result.id}.`);
      else console.log(`${action === 'generate' ? 'Generated' : 'Uploaded'} image: ${result.media?.url || result.output || result.media?.publicId}`);
      if (result.blog) console.log(`Attached to blog ${opts.blog}.`);
    }
  } catch (error) { fail(opts, error, error.status === 401 || error.status === 403 ? EXIT_CODES.AUTH : EXIT_CODES.ERROR); }
}

async function runComment(opts, args, action) {
  const context = await authenticatedBlogClient(opts);
  if (!context) return;
  try {
    const result = await COMMENT_COMMANDS[action]({ client: context.client, id: args[0], options: opts });
    output(opts, { ok: true, data: result });
    if (!opts.json && !opts.quiet) {
      if (action === 'list') {
        for (const row of result) console.log(`${row.id}\t${row.parent_id ? 'reply' : 'comment'}\t${row.display_name || row.username || 'Anonymous'}\t${row.content}`);
      } else console.log(`${action} completed for ${result.id}.`);
    }
  } catch (error) { fail(opts, error, error.status === 401 || error.status === 403 ? EXIT_CODES.AUTH : EXIT_CODES.ERROR); }
}

async function runCollab(opts, args, action) {
  const context = await authenticatedBlogClient(opts);
  if (!context) return;
  const client = new CollaborationClient(context.http);
  try {
    const result = await COLLAB_COMMANDS[action]({ client, id: args[0], options: opts });
    output(opts, { ok: true, data: result });
    if (opts.json || opts.quiet) return;
    if (result.dryRun) {
      console.log(`Dry run: ${result.action} validated; no changes sent.`);
      return;
    }
    const rows = action === 'invitations'
      ? result
      : action === 'list'
        ? result.collaborators || []
        : [result];
    for (const row of rows) {
      console.log([
        row.blogId || row.userId,
        row.status,
        row.role,
        row.username || row.title,
        row.notificationState,
      ].filter(Boolean).join('\t'));
    }
  } catch (error) {
    fail(opts, error, error.status === 401 || error.status === 403 ? EXIT_CODES.AUTH : EXIT_CODES.ERROR);
  }
}

async function runSkill(opts, args, action) {
  try {
    const result = await SKILL_COMMANDS[action]({ id: args[0], options: opts });
    output(opts, { ok: true, data: result });
    if (opts.json || opts.quiet) return;
    if (action === 'list') {
      for (const skill of result) console.log(`${skill.name}\tCLI >= ${skill.minimumCliVersion || 'unknown'}\t${skill.description}`);
    } else if (action === 'inspect') {
      process.stdout.write(result.content);
    } else if (result.dryRun) {
      console.log(`Dry run: install ${result.name} to ${result.target}${result.replace ? ' (replace)' : ''}.`);
    } else {
      console.log(`Installed ${result.name} at ${result.target}.`);
    }
  } catch (error) {
    fail(opts, error);
  }
}

async function runAnalytics(opts, _args, action) {
  const context = await authenticatedBlogClient(opts);
  if (!context) return;
  const client = new AnalyticsClient(context.http);
  const normalized = {
    ...opts,
    limit: opts.limit === undefined ? undefined : Number.parseInt(opts.limit, 10),
  };
  try {
    const result = await ANALYTICS_COMMANDS[action]({ client, options: normalized });
    output(opts, { ok: true, data: result });
    if (opts.json || opts.quiet) return;
    if (action === 'export') {
      console.log(`Exported ${result.rows} rows to ${result.output}.`);
      return;
    }
    const payload = result.data;
    console.log(`${payload.scope.label} · ${payload.dimension} · ${payload.range.key}`);
    if (payload.dimension === 'overview') {
      for (const [metric, value] of Object.entries(payload.values.totals)) {
        console.log(`${metric}\t${value}\t${payload.values.changes[metric]}%`);
      }
    } else if (payload.dimension === 'timeline') {
      payload.values.labels.forEach((label, index) => console.log(`${label}\t${payload.values.views[index]}\t${payload.values.reads[index]}`));
    } else {
      for (const row of payload.values) console.log(Object.values(row).join('\t'));
      if (result.meta?.nextCursor) console.log(`Next cursor: ${result.meta.nextCursor}`);
    }
  } catch (error) {
    fail(opts, error, error.status === 401 || error.status === 403 ? EXIT_CODES.AUTH : EXIT_CODES.ERROR);
  }
}

const ROUTES = {
  auth: {
    login: runLogin,
    status: runStatus,
    whoami: runWhoami,
    logout: runLogout,
    revoke: runRevoke,
    profiles: runProfiles,
    use: runUse,
  },
  blog: Object.fromEntries(Object.keys(BLOG_COMMANDS).map((action) => [
    action,
    (opts, args) => runBlog(opts, args, action),
  ])),
  org: Object.fromEntries(Object.keys(ORG_COMMANDS).map((action) => [
    action,
    (opts, args) => runOrg(opts, args, action),
  ])),
  collab: Object.fromEntries(Object.keys(COLLAB_COMMANDS).map((action) => [
    action,
    (opts, args) => runCollab(opts, args, action),
  ])),
  skill: Object.fromEntries(Object.keys(SKILL_COMMANDS).map((action) => [
    action,
    (opts, args) => runSkill(opts, args, action),
  ])),
  analytics: Object.fromEntries(Object.keys(ANALYTICS_COMMANDS).map((action) => [
    action,
    (opts, args) => runAnalytics(opts, args, action),
  ])),
  media: Object.fromEntries(Object.keys(MEDIA_COMMANDS).map((action) => [
    action,
    (opts, args) => runMedia(opts, args, action),
  ])),
  comment: Object.fromEntries(Object.keys(COMMENT_COMMANDS).map((action) => [
    action,
    (opts, args) => runComment(opts, args, action),
  ])),
  integrations: {
    'cloudinary-status': (opts, args) => runIntegrations(opts, args, 'cloudinary-status'),
    'cloudinary-disconnect': (opts, args) => runIntegrations(opts, args, 'cloudinary-disconnect'),
    'pollinations-status': (opts, args) => runIntegrations(opts, args, 'pollinations-status'),
    'pollinations-disconnect': (opts, args) => runIntegrations(opts, args, 'pollinations-disconnect'),
  },
  disconnect: {
    cloudinary: (opts, args) => runIntegrations(opts, args, 'cloudinary-disconnect'),
    pollinations: (opts, args) => runIntegrations(opts, args, 'pollinations-disconnect'),
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
    process.exitCode = EXIT_CODES.USAGE;
    return;
  }

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  if (positionals[0] === 'register') {
    await runRegister(values);
    return;
  }

  positionals = normalizeCommand(positionals);
  const [category, action] = positionals;
  const categoryRoutes = ROUTES[category];

  if (!categoryRoutes) {
    process.stderr.write(`Error: Unknown command category "${category}".\n`);
    process.stderr.write(`Available categories: ${Object.keys(ROUTES).join(", ")}\n`);
    process.exitCode = EXIT_CODES.USAGE;
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
    process.exitCode = EXIT_CODES.USAGE;
    return;
  }

  await handler(values, positionals.slice(2));
}

main();
