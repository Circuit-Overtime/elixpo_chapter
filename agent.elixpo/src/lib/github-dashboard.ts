import "server-only";

import { cache } from "react";

const CONTROL_REPO = process.env.ELIXPO_GITHUB_CONTROL_REPO || "elixpo/agent.elixpo";
const API_ROOT = "https://api.github.com";

export type RunStatus = "queued" | "in_progress" | "completed" | "unknown";

export type DashboardRun = {
  id: number;
  name: string;
  status: RunStatus;
  conclusion: string | null;
  event: string;
  branch: string;
  actor: string;
  actorAvatar: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  attempt: number;
  floor: FloorSlug;
};

export type DashboardWorkItem = {
  id: number;
  number: number;
  kind: "issue" | "pull_request";
  title: string;
  state: string;
  url: string;
  author: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  mergedAt: string | null;
};

export type DashboardCommit = {
  sha: string;
  message: string;
  url: string;
  author: string;
  authoredAt: string;
};

export type StateReceipt = {
  name: string;
  status: string;
  stage: string;
  key: string;
  issueUrl: string;
  runId: string;
  tokenSpent: number | null;
  tokenLimit: number | null;
  updatedAt: string;
  detail: string;
};

export type SecurityEvent = {
  id: string;
  title: string;
  detail: string;
  level: "info" | "warning" | "critical" | "success";
  occurredAt: string;
  url: string | null;
  source: string;
};

export type FloorSlug = "operations" | "oreoflow" | "discussions";

export type FloorDefinition = {
  slug: FloorSlug;
  level: string;
  name: string;
  shortName: string;
  description: string;
  accent: string;
};

export const floors: FloorDefinition[] = [
  {
    slug: "operations",
    level: "G",
    name: "Operations lobby",
    shortName: "Mentions",
    description: "Repository mentions, approvals, acknowledgements, issue intake, and PR operations.",
    accent: "#3975d5",
  },
  {
    slug: "oreoflow",
    level: "1",
    name: "OreoFlow",
    shortName: "Autonomous work",
    description: "Scout, triage, vet, solve, submit, steward, project, doctor, and janitor runs.",
    accent: "#e53935",
  },
  {
    slug: "discussions",
    level: "2",
    name: "Discussions",
    shortName: "Community desk",
    description: "Announcements, Q&A, polls, mention replies, and discussion safety checks.",
    accent: "#7856c8",
  },
];

export type DashboardSnapshot = {
  generatedAt: string;
  repository: {
    fullName: string;
    url: string;
    avatarUrl: string;
    owner: string;
    description: string;
    defaultBranch: string;
  };
  runs: DashboardRun[];
  work: DashboardWorkItem[];
  commits: DashboardCommit[];
  receipts: StateReceipt[];
  security: SecurityEvent[];
  warnings: string[];
};

type JsonObject = Record<string, unknown>;

function token() {
  return (
    process.env.ELIXPOO_GITHUB_PROJECT_TOKEN ||
    process.env.ELIXPOO_GITHUB_AGENTIC_TOKEN ||
    process.env.GITHUB_TOKEN ||
    ""
  );
}

async function githubFetch<T>(path: string, accept = "application/vnd.github+json"): Promise<T> {
  const authorization = token();
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`GitHub ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

async function githubRaw(path: string): Promise<string> {
  const authorization = token();
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      Accept: "application/vnd.github.raw+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) throw new Error(`GitHub ${response.status} for ${path}`);
  return response.text();
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function floorForWorkflow(name: string): FloorSlug {
  const value = name.toLowerCase();
  if (value.includes("discussion")) return "discussions";
  if (
    value.includes("repository agent") ||
    value.includes("mention") ||
    value.includes("ack") ||
    value.includes("issue intake") ||
    value.includes("approval") ||
    value.includes("pr review")
  ) return "operations";
  return "oreoflow";
}

function receiptTime(data: JsonObject): string {
  const keys = ["updated_at", "checked_at", "decided_at", "cleaned_at", "submitted_at", "failed_at", "started_at", "picked_at", "evaluated_at"];
  for (const key of keys) {
    const value = stringValue(data[key]);
    if (value) return value;
  }
  return "";
}

function parseReceipt(name: string, text: string): StateReceipt | null {
  try {
    const data = JSON.parse(text) as JsonObject;
    const failure = typeof data.failure === "object" && data.failure ? data.failure as JsonObject : {};
    const status = stringValue(data.status, "recorded");
    const stage = stringValue(data.stage, stringValue(failure.stage, name));
    const detail = stringValue(data.error) || stringValue(data.reason) || stringValue(data.summary) || stringValue(failure.message) || `${name} state recorded`;
    return {
      name,
      status,
      stage,
      key: stringValue(data.key),
      issueUrl: stringValue(data.issue_url),
      runId: stringValue(data.run_id),
      tokenSpent: numberValue(data.token_spent) ?? numberValue(data.spent),
      tokenLimit: numberValue(data.token_limit) ?? numberValue(data.solve_token_budget),
      updatedAt: receiptTime(data),
      detail,
    };
  } catch {
    return null;
  }
}

function securityEvents(runs: DashboardRun[], receipts: StateReceipt[]): SecurityEvent[] {
  const workflowEvents = runs
    .filter((run) => run.name.toLowerCase().includes("security") || ["failure", "cancelled", "timed_out", "action_required"].includes(run.conclusion || ""))
    .map((run) => ({
      id: `run-${run.id}`,
      title: run.name,
      detail: `${run.event} on ${run.branch} · ${run.conclusion || run.status}`,
      level: run.conclusion === "success" ? "success" as const : run.conclusion ? "warning" as const : "info" as const,
      occurredAt: run.updatedAt,
      url: run.url,
      source: "GitHub Actions",
    }));

  const receiptEvents = receipts
    .filter((receipt) => receipt.name === "doctor" || receipt.name === "janitor")
    .map((receipt) => ({
      id: `receipt-${receipt.name}-${receipt.runId || receipt.updatedAt}`,
      title: `${receipt.name[0].toUpperCase()}${receipt.name.slice(1)} · ${receipt.status}`,
      detail: receipt.detail,
      level: ["complete", "continue", "healthy"].includes(receipt.status) ? "success" as const : receipt.status === "terminate" ? "critical" as const : "info" as const,
      occurredAt: receipt.updatedAt,
      url: receipt.issueUrl || null,
      source: `state/${receipt.name}.json`,
    }));

  return [...workflowEvents, ...receiptEvents]
    .filter((event) => event.occurredAt)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

async function settled<T>(label: string, request: Promise<T>, warnings: string[]): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    warnings.push(`${label}: ${error instanceof Error ? error.message : "request failed"}`);
    return null;
  }
}

export const getDashboardSnapshot = cache(async (): Promise<DashboardSnapshot> => {
  const warnings: string[] = [];
  const [owner, repo] = CONTROL_REPO.split("/");
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const stateNames = ["solve", "doctor", "janitor", "vet", "submit", "pick", "project"];

  const [repositoryData, runsData, issuesData, pullsData, commitsData, ...stateData] = await Promise.all([
    settled("repository", githubFetch<JsonObject>(repoPath), warnings),
    settled("workflow runs", githubFetch<{ workflow_runs?: JsonObject[] }>(`${repoPath}/actions/runs?per_page=100`), warnings),
    settled("issues", githubFetch<JsonObject[]>(`${repoPath}/issues?state=all&sort=updated&direction=desc&per_page=50`), warnings),
    settled("pull requests", githubFetch<JsonObject[]>(`${repoPath}/pulls?state=all&sort=updated&direction=desc&per_page=30`), warnings),
    settled("commits", githubFetch<JsonObject[]>(`${repoPath}/commits?per_page=20`), warnings),
    ...stateNames.map((name) => settled(`state/${name}.json`, githubRaw(`${repoPath}/contents/state/${name}.json`), warnings)),
  ]);

  const repositoryOwner = repositoryData?.owner as JsonObject | undefined;
  const repository = {
    fullName: stringValue(repositoryData?.full_name, CONTROL_REPO),
    url: stringValue(repositoryData?.html_url, `https://github.com/${CONTROL_REPO}`),
    avatarUrl: stringValue(repositoryOwner?.avatar_url),
    owner: stringValue(repositoryOwner?.login, owner),
    description: stringValue(repositoryData?.description),
    defaultBranch: stringValue(repositoryData?.default_branch, "main"),
  };

  const runs = (runsData?.workflow_runs || []).map((item): DashboardRun => {
    const actor = item.actor as JsonObject | undefined;
    const name = stringValue(item.name, "Unnamed workflow");
    const rawStatus = stringValue(item.status, "unknown");
    const status: RunStatus = ["queued", "in_progress", "completed"].includes(rawStatus) ? rawStatus as RunStatus : "unknown";
    return {
      id: numberValue(item.id) || 0,
      name,
      status,
      conclusion: stringValue(item.conclusion) || null,
      event: stringValue(item.event, "unknown"),
      branch: stringValue(item.head_branch, repository.defaultBranch),
      actor: stringValue(actor?.login, "github"),
      actorAvatar: stringValue(actor?.avatar_url),
      createdAt: stringValue(item.created_at),
      updatedAt: stringValue(item.updated_at),
      url: stringValue(item.html_url),
      attempt: numberValue(item.run_attempt) || 1,
      floor: floorForWorkflow(name),
    };
  });

  const issues = (issuesData || [])
    .filter((item) => !item.pull_request)
    .map((item): DashboardWorkItem => {
      const user = item.user as JsonObject | undefined;
      const labels = Array.isArray(item.labels) ? item.labels : [];
      return {
        id: numberValue(item.id) || 0,
        number: numberValue(item.number) || 0,
        kind: "issue",
        title: stringValue(item.title),
        state: stringValue(item.state),
        url: stringValue(item.html_url),
        author: stringValue(user?.login),
        labels: labels.map((label) => typeof label === "string" ? label : stringValue((label as JsonObject).name)).filter(Boolean),
        createdAt: stringValue(item.created_at),
        updatedAt: stringValue(item.updated_at),
        draft: false,
        mergedAt: null,
      };
    });

  const pulls = (pullsData || []).map((item): DashboardWorkItem => {
    const user = item.user as JsonObject | undefined;
    const labels = Array.isArray(item.labels) ? item.labels : [];
    return {
      id: numberValue(item.id) || 0,
      number: numberValue(item.number) || 0,
      kind: "pull_request",
      title: stringValue(item.title),
      state: stringValue(item.state),
      url: stringValue(item.html_url),
      author: stringValue(user?.login),
      labels: labels.map((label) => typeof label === "string" ? label : stringValue((label as JsonObject).name)).filter(Boolean),
      createdAt: stringValue(item.created_at),
      updatedAt: stringValue(item.updated_at),
      draft: Boolean(item.draft),
      mergedAt: stringValue(item.merged_at) || null,
    };
  });

  const commits = (commitsData || []).map((item): DashboardCommit => {
    const commit = item.commit as JsonObject | undefined;
    const commitAuthor = commit?.author as JsonObject | undefined;
    const author = item.author as JsonObject | undefined;
    return {
      sha: stringValue(item.sha),
      message: stringValue(commit?.message).split("\n")[0],
      url: stringValue(item.html_url),
      author: stringValue(author?.login, stringValue(commitAuthor?.name, "unknown")),
      authoredAt: stringValue(commitAuthor?.date),
    };
  });

  const receipts = stateData
    .map((text, index) => typeof text === "string" ? parseReceipt(stateNames[index], text) : null)
    .filter((receipt): receipt is StateReceipt => Boolean(receipt));

  return {
    generatedAt: new Date().toISOString(),
    repository,
    runs,
    work: [...pulls, ...issues].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    commits,
    receipts,
    security: securityEvents(runs, receipts),
    warnings,
  };
});

export function getFloor(slug: string): FloorDefinition | undefined {
  return floors.find((floor) => floor.slug === slug);
}
