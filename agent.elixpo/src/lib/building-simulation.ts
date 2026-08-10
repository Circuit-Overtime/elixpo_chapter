export type AgentStatus = "working" | "watching" | "waiting" | "sleeping";
export type RoomStatus = "active" | "queued" | "completed" | "guarded";
export type FloorId = "mentions" | "oreoflow" | "discussions";
export type AgentZone = "intake" | "workshop" | "control" | "output";
export type AgentIcon =
  | "archive"
  | "bot"
  | "box"
  | "carrier"
  | "code"
  | "database"
  | "doctor"
  | "discussion"
  | "globe"
  | "guard"
  | "pick"
  | "project"
  | "publish"
  | "route"
  | "search"
  | "triage"
  | "vet";

export type AgentSnapshot = {
  id: string;
  name: string;
  role: string;
  icon: AgentIcon;
  status: AgentStatus;
  zone: AgentZone;
  activity: string;
  detail: string;
  model: string;
  memory: number;
  tokens: number;
  elapsed: string;
  task: string;
  logs: string[];
};

export type CommunicationSnapshot = {
  id: string;
  from: string;
  to: string;
  kind: string;
  detail: string;
  state: "moving" | "delivered" | "waiting";
  age: string;
};

export type RoomSnapshot = {
  id: string;
  name: string;
  shortName: string;
  subject: string;
  repository: string;
  status: RoomStatus;
  progress: number;
  runId: string;
  started: string;
  agents: AgentSnapshot[];
  communications: CommunicationSnapshot[];
};

export type FloorSnapshot = {
  id: FloorId;
  level: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  rooms: RoomSnapshot[];
};

const a = (
  id: string,
  name: string,
  role: string,
  icon: AgentIcon,
  status: AgentStatus,
  zone: AgentZone,
  activity: string,
  overrides: Partial<AgentSnapshot> = {},
): AgentSnapshot => ({
  id,
  name,
  role,
  icon,
  status,
  zone,
  activity,
  detail: `${name} owns the ${role.toLowerCase()} capability inside this isolated room.`,
  model: "deterministic",
  memory: 42,
  tokens: 0,
  elapsed: "—",
  task: activity,
  logs: ["room lease verified", "capability ready", "waiting for the next typed handoff"],
  ...overrides,
});

const serviceAgents = (scope: string): AgentSnapshot[] => [
  a("security", "Security", "Capability gate", "guard", "watching", "control", `Protecting ${scope}`, {
    memory: 58,
    elapsed: "06:18",
    detail: "Validates identity, scope, untrusted content, artifacts, and public-action policy.",
    logs: ["source signature valid", "delegation depth: 1", "no policy violations"],
  }),
  a("doctor", "Doctor", "Runtime guardian", "doctor", "watching", "control", `Supervising ${scope}`, {
    memory: 71,
    elapsed: "06:18",
    detail: "Watches message loops, token slope, elapsed time, memory, and provider health.",
    logs: ["message velocity normal", "token slope stable", "memory below warning threshold"],
  }),
  a("janitor", "Janitor", "Resource cleanup", "archive", "waiting", "control", "Cleanup manifest armed", {
    memory: 27,
    detail: "Reclaims exact room resources only after a matching terminal authorization.",
    logs: ["workspace registered", "shared resources marked preserve", "awaiting terminal receipt"],
  }),
  a("carrier", "Carrier", "Typed courier", "carrier", "working", "output", "Delivering a room handoff", {
    memory: 34,
    elapsed: "00:04",
    detail: "Moves typed tasks, receipts, and artifact references without rewriting their contents.",
    logs: ["outbox receipt committed", "destination capability verified", "delivery acknowledged"],
  }),
];

const oreoRoom = (
  id: string,
  repository: string,
  issue: string,
  subject: string,
  status: RoomStatus,
  progress: number,
  variant: "coding" | "vetting",
): RoomSnapshot => ({
  id,
  name: `${repository} ${issue}`,
  shortName: issue,
  repository,
  subject,
  status,
  progress,
  runId: id.slice(-5),
  started: variant === "coding" ? "6m ago" : "2m ago",
  agents: [
    a("scout", "Scout", "Repository radar", "search", "sleeping", "intake", "Discovery complete", { memory: 35 }),
    a("triage", "Triage", "Issue classifier", "triage", variant === "vetting" ? "working" : "sleeping", "intake", variant === "vetting" ? "Scoring issue evidence" : "Candidate handed off", {
      model: "nova-fast",
      memory: 92,
      tokens: variant === "vetting" ? 3180 : 0,
      elapsed: variant === "vetting" ? "00:41" : "—",
    }),
    a("vet", "Vet", "Feasibility gate", "vet", variant === "vetting" ? "working" : "sleeping", "intake", variant === "vetting" ? "Checking scope and claims" : "Issue approved", {
      model: "nova-fast",
      memory: 83,
      tokens: variant === "vetting" ? 2290 : 0,
    }),
    a("pick", "Pick", "Queue selector", "pick", "sleeping", "intake", "Ledger recorded", { memory: 29 }),
    a("solve", "Solve", "Coding workspace", "code", variant === "coding" ? "working" : "waiting", "workshop", variant === "coding" ? "Implementing focused patch" : "Waiting for Vet", {
      model: "qwen-coder via CCR",
      memory: variant === "coding" ? 648 : 51,
      tokens: variant === "coding" ? 48210 : 0,
      elapsed: variant === "coding" ? "06:17" : "—",
      detail: "Owns repository comprehension, bounded edits, verification, semantic review, and the local commit.",
      task: `${repository}${issue} · ${subject}`,
      logs: variant === "coding"
        ? ["read repository guidance", "changed one implementation file", "TypeScript verification running"]
        : ["workspace admission held", "waiting on feasibility artifact", "no provider session started"],
    }),
    a("web-search", "Web Search", "External research", "globe", variant === "coding" ? "watching" : "sleeping", "workshop", variant === "coding" ? "Research channel ready" : "No research request", {
      model: "perplexity-fast on demand",
      memory: 46,
      detail: "A read-only specialist that returns bounded cited evidence only when repository context is insufficient.",
      logs: ["no direct repository access", "primary-source policy loaded", "zero searches billed this run"],
    }),
    ...serviceAgents(`${repository}${issue}`),
    a("submit", "Submit", "Publication gate", "publish", "sleeping", "output", "Waiting for verified commit", {
      model: "nova-fast + qwen-safety",
      memory: 32,
    }),
    a("steward", "Steward", "PR shepherd", "project", "sleeping", "output", "No pull request yet", { memory: 36 }),
    a("project", "Project", "Board synchronizer", "box", "working", "output", "Updating room phase", { memory: 55, elapsed: "00:08" }),
  ],
  communications: variant === "coding"
    ? [
        { id: `${id}-1`, from: "Vet", to: "Solve", kind: "feasibility.artifact", detail: "approved · 2 files · 9 min", state: "delivered", age: "5m" },
        { id: `${id}-2`, from: "Solve", to: "Web Search", kind: "research.availability", detail: "channel opened; no query sent", state: "waiting", age: "4m" },
        { id: `${id}-3`, from: "Solve", to: "Doctor", kind: "telemetry.status", detail: "48.2k tokens · 648 MB · healthy", state: "moving", age: "now" },
        { id: `${id}-4`, from: "Project", to: "Carrier", kind: "phase.receipt", detail: "solving state synchronized", state: "delivered", age: "8s" },
      ]
    : [
        { id: `${id}-1`, from: "Triage", to: "Vet", kind: "candidate.artifact", detail: "conversation and linked PR evidence", state: "delivered", age: "41s" },
        { id: `${id}-2`, from: "Vet", to: "Security", kind: "scope.challenge", detail: "validate external repository policy", state: "moving", age: "now" },
        { id: `${id}-3`, from: "Carrier", to: "Project", kind: "phase.receipt", detail: "vetting state synchronized", state: "delivered", age: "12s" },
      ],
});

export const buildingFloors: FloorSnapshot[] = [
  {
    id: "mentions",
    level: "G",
    name: "Operations lobby",
    subtitle: "Standard @elixpoo work",
    description: "Authorization, issue replies, PR reviews, acknowledgements, and cross-floor delegation.",
    accent: "#3975d5",
    rooms: [
      {
        id: "mention-lixrl-44",
        name: "Issue reply · lixrl.com#44",
        shortName: "#44",
        repository: "elixpo/lixrl.com",
        subject: "Explain analytics retention behavior",
        status: "active",
        progress: 66,
        runId: "m4a82",
        started: "3m ago",
        agents: [
          a("router", "Router", "Intent desk", "route", "working", "intake", "Classifying a technical question", { model: "nova-fast", tokens: 940, memory: 66 }),
          a("responder", "Responder", "Issue reply", "bot", "waiting", "workshop", "Waiting on OreoFlow evidence", { model: "nova-fast", memory: 49 }),
          ...serviceAgents("mention #44"),
          a("receipt", "Receipt", "Status writer", "project", "working", "output", "Posting progress markers", { memory: 31 }),
        ],
        communications: [
          { id: "m44-1", from: "Router", to: "Security", kind: "intent.request", detail: "technical question · trusted user", state: "delivered", age: "2m" },
          { id: "m44-2", from: "Carrier", to: "OreoFlow / Room #44", kind: "task.request", detail: "repository-grounded answer requested", state: "moving", age: "now" },
          { id: "m44-3", from: "Receipt", to: "GitHub", kind: "progress.receipt", detail: "looking into this", state: "delivered", age: "34s" },
        ],
      },
      {
        id: "review-agent-26",
        name: "PR review · agent.elixpo#26",
        shortName: "PR #26",
        repository: "elixpo/agent.elixpo",
        subject: "Review workflow state migration",
        status: "queued",
        progress: 12,
        runId: "p8dc1",
        started: "1m ago",
        agents: [
          a("router", "Router", "Intent desk", "route", "working", "intake", "Checking review authorization", { model: "nova-fast", tokens: 510 }),
          a("responder", "Responder", "PR review", "bot", "waiting", "workshop", "OreoFlow room queued"),
          ...serviceAgents("PR #26").map((agent) => ({ ...agent, status: agent.id === "carrier" ? "waiting" : agent.status })),
        ],
        communications: [
          { id: "p26-1", from: "Router", to: "Security", kind: "authorization.check", detail: "trusted org · watched repository", state: "moving", age: "now" },
        ],
      },
      {
        id: "reject-external-901",
        name: "Mention · external#901",
        shortName: "#901",
        repository: "outside/example",
        subject: "Untrusted external mention",
        status: "completed",
        progress: 100,
        runId: "r103e",
        started: "18m ago",
        agents: [
          a("router", "Router", "Intent desk", "route", "sleeping", "intake", "Request classified"),
          a("security", "Security", "Capability gate", "guard", "sleeping", "control", "Policy rejection complete"),
          a("responder", "Responder", "Polite decline", "bot", "sleeping", "output", "Rejection posted"),
          a("doctor", "Doctor", "Runtime guardian", "doctor", "sleeping", "control", "Run terminal"),
          a("janitor", "Janitor", "Resource cleanup", "archive", "sleeping", "control", "No resources leaked"),
        ],
        communications: [
          { id: "r901-1", from: "Security", to: "Responder", kind: "policy.denied", detail: "source outside trusted scope", state: "delivered", age: "18m" },
        ],
      },
    ],
  },
  {
    id: "oreoflow",
    level: "01",
    name: "OreoFlow workshop",
    subtitle: "Full contribution system",
    description: "Concurrent, isolated rooms that understand repositories, solve issues, verify changes, and shepherd PRs.",
    accent: "#e53935",
    rooms: [
      oreoRoom("oreo-lixrl-24-a42f9", "elixpo/lixrl.com", "#24", "Correct analytics timezone labels", "active", 58, "coding"),
      oreoRoom("oreo-agent-31-f9d82", "elixpo/agent.elixpo", "#31", "Bound workflow recovery dispatch", "active", 27, "vetting"),
    ],
  },
  {
    id: "discussions",
    level: "02",
    name: "Discussion studio",
    subtitle: "Community conversations",
    description: "Mood-aware Q&A, announcements, polls, and replies with technical handoffs to OreoFlow.",
    accent: "#7856c8",
    rooms: [
      {
        id: "discussion-qna-mlops",
        name: "Q&A · MLOps reliability",
        shortName: "Q&A",
        repository: "elixpo/elixpo",
        subject: "What makes a deployment rollback trustworthy?",
        status: "active",
        progress: 72,
        runId: "d71b2",
        started: "4m ago",
        agents: [
          a("mood", "Mood", "Cadence and tone", "discussion", "sleeping", "intake", "Q&A selected for this cycle", { model: "heuristic variance" }),
          a("writer", "Writer", "Discussion composition", "bot", "working", "workshop", "Drafting a grounded question", { model: "nova-fast", memory: 104, tokens: 3410, elapsed: "01:02" }),
          a("web-search", "Web Search", "External research", "globe", "working", "workshop", "Checking primary MLOps guidance", { model: "perplexity-fast", memory: 51, tokens: 1880, elapsed: "00:18" }),
          ...serviceAgents("Q&A draft"),
          a("publisher", "Publisher", "Discussion post", "publish", "waiting", "output", "Waiting for safety approval", { model: "qwen-safety" }),
        ],
        communications: [
          { id: "dq-1", from: "Mood", to: "Writer", kind: "topic.brief", detail: "Q&A · reliability · curious tone", state: "delivered", age: "3m" },
          { id: "dq-2", from: "Writer", to: "Web Search", kind: "research.request", detail: "2 primary sources · rollback evidence", state: "moving", age: "now" },
          { id: "dq-3", from: "Security", to: "Publisher", kind: "publication.hold", detail: "awaiting final cited artifact", state: "waiting", age: "12s" },
        ],
      },
      {
        id: "discussion-release-aug",
        name: "Announcement · August release",
        shortName: "Release",
        repository: "elixpo/elixpo",
        subject: "Merged changes and project direction",
        status: "queued",
        progress: 8,
        runId: "d02ca",
        started: "scheduled",
        agents: [
          a("mood", "Mood", "Cadence and tone", "discussion", "waiting", "intake", "Cooldown check pending"),
          a("writer", "Writer", "Announcement composition", "bot", "sleeping", "workshop", "Waiting for merge digest"),
          ...serviceAgents("release announcement").map((agent) => ({ ...agent, status: "sleeping" as AgentStatus })),
          a("publisher", "Publisher", "Discussion post", "publish", "sleeping", "output", "No publication artifact"),
        ],
        communications: [
          { id: "dr-1", from: "Project", to: "Carrier", kind: "merge.digest", detail: "scheduled after cooldown", state: "waiting", age: "—" },
        ],
      },
    ],
  },
];

export const buildingCommunications: CommunicationSnapshot[] = [
  { id: "building-1", from: "Lobby / mention #44", to: "OreoFlow / lixrl #24", kind: "task.request", detail: "repository-grounded technical answer", state: "moving", age: "now" },
  { id: "building-2", from: "Discussion / Q&A", to: "Web Search", kind: "research.request", detail: "rollback reliability evidence", state: "moving", age: "3s" },
  { id: "building-3", from: "OreoFlow / agent #31", to: "Operations lobby", kind: "task.status", detail: "vetting · 27%", state: "delivered", age: "12s" },
  { id: "building-4", from: "Security / all floors", to: "Project", kind: "health.receipt", detail: "all capability gates healthy", state: "delivered", age: "21s" },
];
