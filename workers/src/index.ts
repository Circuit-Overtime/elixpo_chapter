/** Signed GitHub webhook ingress. It stores no agent state or repository data. */

export interface Env {
  GITHUB_WEBHOOK_SECRET: string;
  GITHUB_CONTROL_TOKEN: string;
  CONTROL_REPOSITORY: string;
  ALLOWED_OWNERS: string;
}

const MAX_BODY_BYTES = 1_000_000;
const MAX_REPOSITORY_EVENTS_PER_MINUTE = 30;
const REPLAY_TTL_MS = 86_400_000;
const MAX_REPLAY_ENTRIES = 5_000;
const MAX_RATE_ENTRIES = 1_000;
// Best-effort edge guards. GitHub/Steward idempotency markers remain authoritative
// because isolates can restart or serve requests concurrently in different regions.
const seenDeliveries = new Map<string, number>();
const repositoryRates = new Map<string, { minute: number; count: number }>();
const ALLOWED_ACTIONS: Record<string, Set<string>> = {
  issue_comment: new Set(["created"]),
  pull_request_review_comment: new Set(["created"]),
  pull_request_review: new Set(["submitted"]),
  pull_request: new Set(["opened", "synchronize", "closed", "review_requested"]),
  discussion: new Set(["created", "edited"]),
  discussion_comment: new Set(["created", "edited"]),
};

function response(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const size = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

async function validSignature(secret: string, body: ArrayBuffer, supplied: string): Promise<boolean> {
  if (!secret || !supplied.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = `sha256=${hex(await crypto.subtle.sign("HMAC", key, body))}`;
  return constantTimeEqual(expected, supplied.toLowerCase());
}

function pruneExpiredDeliveries(now: number): void {
  for (const [delivery, expiresAt] of seenDeliveries) {
    if (expiresAt <= now) seenDeliveries.delete(delivery);
  }
  while (seenDeliveries.size >= MAX_REPLAY_ENTRIES) {
    const oldest = seenDeliveries.keys().next().value;
    if (oldest === undefined) break;
    seenDeliveries.delete(oldest);
  }
}

function replayed(delivery: string, now = Date.now()): boolean {
  pruneExpiredDeliveries(now);
  if ((seenDeliveries.get(delivery) || 0) > now) return true;
  seenDeliveries.set(delivery, now + REPLAY_TTL_MS);
  return false;
}

function rateLimited(repository: string, now = Date.now()): boolean {
  const minute = Math.floor(now / 60_000);
  const current = repositoryRates.get(repository);
  const count = current?.minute === minute ? current.count : 0;
  if (count >= MAX_REPOSITORY_EVENTS_PER_MINUTE) return true;
  repositoryRates.set(repository, { minute, count: count + 1 });
  if (repositoryRates.size > MAX_RATE_ENTRIES) {
    for (const [name, entry] of repositoryRates) {
      if (entry.minute < minute) repositoryRates.delete(name);
    }
    while (repositoryRates.size > MAX_RATE_ENTRIES) {
      const oldest = repositoryRates.keys().next().value;
      if (oldest === undefined) break;
      repositoryRates.delete(oldest);
    }
  }
  return false;
}

function dispatchType(event: string): string {
  return event.startsWith("discussion") ? "discussion_reconcile" : "steward_reconcile";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return response(200, { status: "ok", service: "oreoflow-webhook-ingress" });
    }
    if (request.method !== "POST" || url.pathname !== "/github/webhook") {
      return response(404, { error: "not_found" });
    }
    const length = Number(request.headers.get("content-length") || "0");
    if (length > MAX_BODY_BYTES) return response(413, { error: "payload_too_large" });
    const event = request.headers.get("x-github-event") || "";
    const delivery = request.headers.get("x-github-delivery") || "";
    const signature = request.headers.get("x-hub-signature-256") || "";
    if (!event || !delivery || !ALLOWED_ACTIONS[event]) {
      return response(400, { error: "unsupported_event" });
    }
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return response(413, { error: "payload_too_large" });
    if (!(await validSignature(env.GITHUB_WEBHOOK_SECRET, body, signature))) {
      return response(401, { error: "invalid_signature" });
    }
    if (replayed(delivery)) return response(202, { status: "duplicate" });
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(new TextDecoder().decode(body));
    } catch {
      return response(400, { error: "invalid_json" });
    }
    const action = String(payload.action || "");
    if (!ALLOWED_ACTIONS[event].has(action)) return response(202, { status: "ignored_action" });
    const fullName = String(payload.repository?.full_name || "");
    const owner = fullName.split("/")[0].toLowerCase();
    const allowedOwners = new Set(
      (env.ALLOWED_OWNERS || "elixpo").split(",").map((item) => item.trim().toLowerCase()),
    );
    if (!fullName || !allowedOwners.has(owner)) return response(403, { error: "repository_denied" });
    if (rateLimited(fullName)) return response(429, { error: "rate_limited" });
    const [controlOwner, controlRepo] = env.CONTROL_REPOSITORY.split("/", 2);
    if (!controlOwner || !controlRepo || !env.GITHUB_CONTROL_TOKEN) {
      return response(503, { error: "ingress_not_configured" });
    }
    const sourceNumber = Number(
      payload.issue?.number || payload.pull_request?.number || payload.discussion?.number || 0,
    );
    const dispatch = await fetch(
      `https://api.github.com/repos/${controlOwner}/${controlRepo}/dispatches`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.GITHUB_CONTROL_TOKEN}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
          "content-type": "application/json",
          "user-agent": "oreoflow-webhook-ingress",
        },
        body: JSON.stringify({
          event_type: dispatchType(event),
          client_payload: {
            delivery,
            event,
            action,
            repository: fullName,
            number: sourceNumber,
          },
        }),
      },
    );
    if (!dispatch.ok) return response(502, { error: "dispatch_failed", status: dispatch.status });
    return response(202, { status: "accepted" });
  },
};
