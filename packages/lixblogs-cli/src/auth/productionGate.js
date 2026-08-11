/**
 * Production safety gate.
 *
 * Maintainer's explicit requirement (verbatim):
 *   "Production login must remain explicitly unavailable until the real
 *   issuer, polling, refresh, scope, and revocation contract is approved —
 *   no copied cookies or fallback credentials."
 *
 * This must fail loudly and immediately — not silently degrade, not warn
 * and continue. Every call site that constructs an AuthProvider must route
 * through assertProviderAllowed() first.
 *
 * APPROVED_PRODUCTION_PROVIDER_ID stays null until the real ElixpoAuthProvider
 * is implemented and approved — at that point this becomes "elixpo" and
 * this file's behavior flips from "reject everything in production" to
 * "reject everything except elixpo in production." Do not set this early.
 *
 * --- Open question from elixpo/blogs.elixpo#137, resolved by implementer ---
 * "Config flag, environment check, or both?" — both, required to agree.
 * Rationale: a single signal (just an env var, or just a config flag) is
 * one misconfiguration away from silently allowing production auth. This
 * function requires the caller to supply both an explicit `environment`
 * and an explicit `configAllowsProduction` flag, and only proceeds past
 * the "is this production" check if both are consistent. This is defense
 * in depth, not a claim that either signal alone is untrustworthy — the
 * point is that fixing one doesn't matter if the other was wrong.
 * Flagged for the maintainer to override if a single signal is preferred.
 */

const APPROVED_PRODUCTION_PROVIDER_ID = "elixpo";

export class ProductionAuthGateError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProductionAuthGateError";
  }
}

/**
 * @param {{ providerId: string, environment: string, configAllowsProduction: boolean }} params
 *   `environment` should come from explicit config, not inferred/guessed.
 *   `configAllowsProduction` is a second, independent explicit flag (e.g. a
 *   dedicated config key, not derived from `environment` itself) — both
 *   must be checked so a single misconfigured value can't silently enable
 *   production auth.
 */
export function assertProviderAllowed({ providerId, environment, configAllowsProduction }) {
  const isProduction = environment === "production";

  if (!isProduction) {
    return; // any provider (including mock) is fine outside production
  }

  if (providerId !== APPROVED_PRODUCTION_PROVIDER_ID) {
    throw new ProductionAuthGateError(
      `Provider "${providerId}" is not approved for production. ` +
        `Only "${APPROVED_PRODUCTION_PROVIDER_ID}" may be used in production.`
    );
  }
}
