export type RunStatus = "queued" | "in_progress" | "completed" | "unknown";

export type FloorSlug = "operations" | "oreoflow" | "discussions";

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

export type FloorDefinition = {
  slug: FloorSlug;
  level: string;
  name: string;
  shortName: string;
  description: string;
  accent: string;
};

export const floors: FloorDefinition[] = [
  { slug: "operations", level: "G", name: "Operations lobby", shortName: "Mentions", description: "Repository mentions, approvals, acknowledgements, issue intake, and PR operations.", accent: "#3975d5" },
  { slug: "oreoflow", level: "1", name: "OreoFlow", shortName: "Autonomous work", description: "Scout, triage, vet, solve, submit, steward, project, doctor, and janitor runs.", accent: "#e53935" },
  { slug: "discussions", level: "2", name: "Discussions", shortName: "Community desk", description: "Announcements, Q&A, polls, mention replies, and discussion safety checks.", accent: "#7856c8" },
];

export type DashboardSnapshot = {
  generatedAt: string;
  repository: { fullName: string; url: string; avatarUrl: string; owner: string; description: string; defaultBranch: string };
  runs: DashboardRun[];
  work: DashboardWorkItem[];
  commits: DashboardCommit[];
  receipts: StateReceipt[];
  security: SecurityEvent[];
  warnings: string[];
};

export function getFloor(slug: string): FloorDefinition | undefined {
  return floors.find((floor) => floor.slug === slug);
}
