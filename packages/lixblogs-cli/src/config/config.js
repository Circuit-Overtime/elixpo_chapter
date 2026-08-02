/**
 * config.js — resolves runtime config for the CLI.
 *
 * Per #135: "Config precedence: flags → environment → named profile →
 * defaults." This module implements that precedence for the small set of
 * values the auth commands need right now (environment, active profile,
 * API base URL placeholder for later). It's deliberately minimal — full
 * config-file/profile-file handling belongs to a later CLI-shell issue,
 * not this one.
 */

const DEFAULTS = {
  environment: "development",
  profile: "default",
};

/**
 * @param {Object} params
 * @param {Object} [params.flags] - parsed CLI flags, e.g. { profile, env }
 * @param {NodeJS.ProcessEnv} [params.env] - defaults to process.env
 * @returns {{ environment: string, profile: string, configAllowsProduction: boolean }}
 */
export function resolveConfig({ flags = {}, env = process.env } = {}) {
  const environment =
    flags.env ?? env.LIXBLOGS_ENV ?? DEFAULTS.environment;

  const profile =
    flags.profile ?? env.LIXBLOGS_PROFILE ?? DEFAULTS.profile;

  // Per the production gate design: this must be a SEPARATE explicit signal
  // from `environment`, not derived from it, so a single misconfigured
  // value can't enable production auth on its own. This only ever becomes
  // relevant once a real provider is approved (see productionGate.js) —
  // until then, production auth is refused regardless of this flag.
  const configAllowsProduction =
    flags.allowProductionAuth === true ||
    env.LIXBLOGS_ALLOW_PRODUCTION_AUTH === "true";

  return { environment, profile, configAllowsProduction };
}
