import { test } from "node:test";
import assert from "node:assert/strict";
import { AuthenticatedClient, LoginRequiredError } from "../src/auth/AuthenticatedClient.js";
import { AuthProviderError } from "../src/auth/ElixpoAuthProvider.js";
import { InMemoryCredentialStore } from "../src/config/CredentialStore.js";

function expiredCredentials() {
  return {
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: Date.now() - 1,
    scopes: ["lixblogs:blog:read"],
  };
}

test("concurrent requests share one refresh and atomically store rotation", async () => {
  const credentialStore = new InMemoryCredentialStore();
  await credentialStore.set("default", expiredCredentials());
  let refreshes = 0;
  const provider = {
    async refresh() {
      refreshes += 1;
      await Promise.resolve();
      return {
        accessToken: "new-access",
        refreshToken: "rotated-refresh",
        expiresInSeconds: 900,
        scopes: ["lixblogs:blog:read"],
      };
    },
  };
  const client = new AuthenticatedClient({ provider, credentialStore, profileId: "default" });
  const [first, second] = await Promise.all([client.credentials(), client.credentials()]);
  assert.equal(refreshes, 1);
  assert.equal(first.refreshToken, "rotated-refresh");
  assert.equal(second.refreshToken, "rotated-refresh");
  assert.equal((await credentialStore.get("default")).refreshToken, "rotated-refresh");
});

test("revoked refresh clears only that profile and asks for login", async () => {
  const credentialStore = new InMemoryCredentialStore();
  await credentialStore.set("work", expiredCredentials());
  const provider = {
    async refresh() {
      throw new AuthProviderError("invalid_grant", { requiresLogin: true });
    },
  };
  const client = new AuthenticatedClient({ provider, credentialStore, profileId: "work" });
  await assert.rejects(() => client.credentials(), LoginRequiredError);
  assert.equal(await credentialStore.get("work"), null);
});

test("authenticated requests target the supplied Blogs URL with bearer auth", async () => {
  const credentialStore = new InMemoryCredentialStore();
  await credentialStore.set("default", {
    ...expiredCredentials(),
    accessToken: "current-access",
    expiresAt: Date.now() + 600_000,
  });
  const calls = [];
  const client = new AuthenticatedClient({
    provider: {},
    credentialStore,
    profileId: "default",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(null, { status: 200 });
    },
  });
  await client.request("/api/v1/blogs");
  assert.equal(calls[0].url, "https://blogs.elixpo.com/api/v1/blogs");
  assert.equal(calls[0].options.headers.authorization, "Bearer current-access");
});

test("authenticated requests cannot send a bearer token to Accounts or another origin", async () => {
  const credentialStore = new InMemoryCredentialStore();
  await credentialStore.set("default", {
    ...expiredCredentials(),
    expiresAt: Date.now() + 600_000,
  });
  const client = new AuthenticatedClient({ provider: {}, credentialStore, profileId: "default" });
  await assert.rejects(
    () => client.request("https://accounts.elixpo.com/api/auth/me"),
    /restricted to the configured LixBlogs/,
  );
});

test("requireScopes fails locally before an under-scoped API operation", async () => {
  const credentialStore = new InMemoryCredentialStore();
  await credentialStore.set("default", {
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: Date.now() + 120_000,
    scopes: ["lixblogs:blog:read"],
  });
  const client = new AuthenticatedClient({ provider: {}, credentialStore, profileId: "default" });
  await assert.rejects(
    client.requireScopes(["lixblogs:blog:write"]),
    (error) => error.code === "insufficient_scope" && error.missingScopes[0] === "lixblogs:blog:write",
  );
});
