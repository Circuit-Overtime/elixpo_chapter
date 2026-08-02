/**
 * providerFactory.js — the single place an AuthProvider gets constructed.
 *
 * Every call site that needs an AuthProvider goes through here, not through
 * `new MockAuthProvider()` directly, so the production gate (see
 * ../auth/productionGate.js) is impossible to bypass by accident. This is
 * intentionally a single narrow chokepoint.
 */

import { MockAuthProvider } from "../auth/MockAuthProvider.js";
import { assertProviderAllowed } from "../auth/productionGate.js";

/**
 * @param {{ environment: string, configAllowsProduction: boolean }} config
 * @returns {import("../auth/AuthProvider.js").AuthProvider}
 */
export function createAuthProvider(config) {
  // Only MockAuthProvider exists today — ElixpoAuthProvider is not
  // implemented yet (blocked on accounts.elixpo.com confirming device-flow
  // support). This factory has exactly one provider to choose from right
  // now, but the shape is here so adding the real one later doesn't change
  // any call site.
  const provider = new MockAuthProvider();

  assertProviderAllowed({
    providerId: provider.providerId,
    environment: config.environment,
    configAllowsProduction: config.configAllowsProduction,
  });

  return provider;
}
