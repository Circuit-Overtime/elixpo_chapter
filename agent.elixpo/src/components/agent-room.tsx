"use client";

import Image from "next/image";
import {
  Activity,
  Archive,
  BellRing,
  Box,
  ChevronRight,
  CircleCheck,
  CircleDot,
  Clock3,
  Cloud,
  Code2,
  Database,
  GitBranch,
  GitPullRequest,
  HeartPulse,
  ListChecks,
  MessageSquareText,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AgentStatus = "working" | "watching" | "waiting" | "sleeping";
type AgentZone = "intake" | "workshop" | "control" | "output";

type Agent = {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  zone: AgentZone;
  icon: LucideIcon;
  activity: string;
  detail: string;
  model: string;
  memory: number;
  tokens: number;
  elapsed: string;
  task: string;
  logs: string[];
};

const agents: Agent[] = [
  {
    id: "scout",
    name: "Scout",
    role: "Repository radar",
    status: "working",
    zone: "intake",
    icon: Search,
    activity: "Scanning watched repositories",
    detail: "Finding recent, tractable issues across the approved repository set.",
    model: "deterministic + nova-fast",
    memory: 118,
    tokens: 3240,
    elapsed: "01:42",
    task: "elixpo/lixrl.com · issue sweep",
    logs: ["loaded 12 watched repositories", "filtered 47 stale issues", "queued 4 candidates for triage"],
  },
  {
    id: "triage",
    name: "Triage",
    role: "Issue classifier",
    status: "working",
    zone: "intake",
    icon: ListChecks,
    activity: "Scoring four candidates",
    detail: "Measures scope, language fit, ownership, activity, and linked pull requests.",
    model: "nova-fast",
    memory: 96,
    tokens: 5190,
    elapsed: "00:38",
    task: "candidate batch · 4 issues",
    logs: ["rejected tracking issue #822", "language gate passed: TypeScript", "estimating files for candidate 03"],
  },
  {
    id: "vet",
    name: "Vet",
    role: "Feasibility gate",
    status: "watching",
    zone: "intake",
    icon: ShieldCheck,
    activity: "Reviewing candidate evidence",
    detail: "Checks conversations, resolution status, scope, and expected solve effort.",
    model: "nova-fast",
    memory: 84,
    tokens: 2293,
    elapsed: "00:21",
    task: "candidate · elixpo/lixrl.com#24",
    logs: ["conversation fetched", "scope estimate: small", "waiting for final suitability verdict"],
  },
  {
    id: "pick",
    name: "Pick",
    role: "Queue selector",
    status: "sleeping",
    zone: "intake",
    icon: CircleDot,
    activity: "No eligible handoff yet",
    detail: "Selects the best vetted issue while honoring the attempt ledger.",
    model: "heuristic",
    memory: 31,
    tokens: 0,
    elapsed: "—",
    task: "waiting on Vet",
    logs: ["queue unchanged", "ledger policy ready", "sleeping until state update"],
  },
  {
    id: "solve",
    name: "Solve",
    role: "Coding workspace",
    status: "working",
    zone: "workshop",
    icon: Code2,
    activity: "Verifying a focused patch",
    detail: "Runs the bounded coding harness, edits the fork, and verifies the diff.",
    model: "qwen-coder via CCR",
    memory: 684,
    tokens: 48210,
    elapsed: "04:16",
    task: "elixpo/lixrl.com#21 · patch/analytics-color",
    logs: ["changed app/dashboard/analytics.tsx", "running local TypeScript check", "1 of 2 verification commands passed"],
  },
  {
    id: "doctor",
    name: "Doctor",
    role: "Runtime guardian",
    status: "watching",
    zone: "control",
    icon: HeartPulse,
    activity: "Watching Solve telemetry",
    detail: "Detects loops, resource pressure, token anomalies, and safe retry conditions.",
    model: "policy + telemetry",
    memory: 72,
    tokens: 0,
    elapsed: "04:17",
    task: "supervising run 8f24b",
    logs: ["command repetition: normal", "token slope: stable", "memory below warning threshold"],
  },
  {
    id: "janitor",
    name: "Janitor",
    role: "Resource cleanup",
    status: "waiting",
    zone: "control",
    icon: Archive,
    activity: "Cleanup manifest armed",
    detail: "Reclaims workspaces and processes after a terminal Doctor decision.",
    model: "deterministic",
    memory: 28,
    tokens: 0,
    elapsed: "—",
    task: "waiting on terminal state",
    logs: ["workspace registered", "fork marked preserve", "cleanup authorization pending"],
  },
  {
    id: "steward",
    name: "Steward",
    role: "PR shepherd",
    status: "waiting",
    zone: "control",
    icon: GitPullRequest,
    activity: "Monitoring two open PRs",
    detail: "Tracks checks, reviews, merge state, and approved follow-up work.",
    model: "nova-fast",
    memory: 91,
    tokens: 820,
    elapsed: "12:08",
    task: "PR #19 and PR #23",
    logs: ["PR #19 checks passing", "PR #23 review requested", "no approved follow-up queued"],
  },
  {
    id: "submit",
    name: "Submit",
    role: "Publication gate",
    status: "sleeping",
    zone: "output",
    icon: GitBranch,
    activity: "No verified commit to publish",
    detail: "Pushes the reviewed branch and opens a disclosed pull request.",
    model: "nova-fast + qwen-safety",
    memory: 35,
    tokens: 0,
    elapsed: "—",
    task: "waiting on Solve",
    logs: ["safety route ready", "Git identity loaded", "sleeping until verification passes"],
  },
  {
    id: "project",
    name: "Project",
    role: "Board synchronizer",
    status: "working",
    zone: "output",
    icon: Box,
    activity: "Reconciling project fields",
    detail: "Keeps repository, issue, PR, phase, and outcome visible on Project V2.",
    model: "deterministic",
    memory: 64,
    tokens: 0,
    elapsed: "00:12",
    task: "OreoFlow project · 7 items",
    logs: ["matched 7 existing items", "updated phase for run 8f24b", "project state consistent"],
  },
  {
    id: "discussions",
    name: "Discussions",
    role: "Community desk",
    status: "sleeping",
    zone: "output",
    icon: MessageSquareText,
    activity: "Next mood scan in 38 min",
    detail: "Creates announcements, questions, polls, and approved mention replies.",
    model: "nova-fast + qwen-safety",
    memory: 42,
    tokens: 0,
    elapsed: "—",
    task: "schedule idle",
    logs: ["community mood: calm", "last discussion: Q&A", "variance cooldown active"],
  },
  {
    id: "gist",
    name: "Gist",
    role: "Shared cache keeper",
    status: "watching",
    zone: "output",
    icon: Database,
    activity: "Cache healthy",
    detail: "Maintains bounded cross-run cache entries and expires stale state.",
    model: "deterministic",
    memory: 39,
    tokens: 0,
    elapsed: "08:51",
    task: "follow-up cache · 6 entries",
    logs: ["6 live cache entries", "oldest TTL: 43 minutes", "no purge required"],
  },
];

const statusLabel: Record<AgentStatus, string> = {
  working: "Working",
  watching: "Watching",
  waiting: "Standby",
  sleeping: "Sleeping",
};

const zones: Array<{ id: AgentZone; label: string; hint: string }> = [
  { id: "intake", label: "Intake bay", hint: "discover · qualify · choose" },
  { id: "workshop", label: "Build room", hint: "understand · edit · verify" },
  { id: "control", label: "Control room", hint: "protect · clean · shepherd" },
  { id: "output", label: "Outbound dock", hint: "publish · sync · converse" },
];

function formatTokens(tokens: number) {
  if (tokens === 0) return "—";
  if (tokens < 1000) return String(tokens);
  return `${(tokens / 1000).toFixed(tokens > 9999 ? 1 : 2)}k`;
}

function StatusMark({ status }: { status: AgentStatus }) {
  return (
    <span className={`status-mark status-${status}`}>
      <span className="status-dot" />
      {statusLabel[status]}
    </span>
  );
}

function AgentCard({ agent, selected, onSelect }: { agent: Agent; selected: boolean; onSelect: () => void }) {
  const Icon = agent.icon;
  return (
    <button
      type="button"
      className={`agent-card ${selected ? "agent-card-selected" : ""}`}
      onClick={onSelect}
      aria-label={`Inspect ${agent.name}`}
      aria-pressed={selected}
    >
      <span className="agent-card-top">
        <span className="agent-icon"><Icon size={17} strokeWidth={1.8} /></span>
        <StatusMark status={agent.status} />
      </span>
      <span className="agent-name-row">
        <span>
          <strong>{agent.name}</strong>
          <small>{agent.role}</small>
        </span>
        <ChevronRight size={16} className="agent-chevron" />
      </span>
      <span className="agent-task">{agent.activity}</span>
      <span className="agent-stats">
        <span><Activity size={12} /> {agent.memory} MB</span>
        <span><Sparkles size={12} /> {formatTokens(agent.tokens)}</span>
      </span>
    </button>
  );
}

function RoomConnector() {
  return (
    <div className="room-connector" aria-hidden="true">
      <span className="connector-line" />
      <span className="data-packet packet-one" />
      <span className="data-packet packet-two" />
      <ChevronRight size={15} />
    </div>
  );
}

export function AgentRoom() {
  const [selectedId, setSelectedId] = useState<string | null>("solve");
  const [now, setNow] = useState<Date | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const update = () => {
      setNow(new Date());
      setPulse((value) => value + 1);
    };
    update();
    const timer = window.setInterval(update, 4000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = useMemo(
    () => agents.find((agent) => agent.id === selectedId) ?? agents[0],
    [selectedId],
  );
  const SelectedIcon = selected.icon;
  const activeCount = agents.filter((agent) => agent.status === "working").length;
  const totalMemory = agents.reduce((total, agent) => total + agent.memory, 0) + (pulse % 3) * 4;
  const totalTokens = agents.reduce((total, agent) => total + agent.tokens, 0);

  return (
    <div className="operations-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Image src="/logo.png" alt="OreoFlow" width={34} height={34} className="brand-logo" priority />
          <span>
            <strong>OreoFlow</strong>
            <small>agent operations</small>
          </span>
        </div>
        <nav className="topbar-nav" aria-label="Main navigation">
          <button className="nav-active" type="button"><Network size={15} /> Room</button>
          <button type="button"><ListChecks size={15} /> Runs</button>
          <button type="button"><GitPullRequest size={15} /> Work</button>
          <button type="button"><BellRing size={15} /> Alerts <span className="nav-count">2</span></button>
        </nav>
        <div className="operator-block">
          <span className="system-live"><span /> Systems live</span>
          <span className="operator-avatar">EB</span>
          <span className="operator-copy"><strong>Operator</strong><small>super-admin preview</small></span>
        </div>
      </header>

      <main className="room-page">
        <section className="room-heading">
          <div>
            <span className="eyebrow">OreoFlow / live topology</span>
            <h1>The agents are in the room.</h1>
            <p>Follow work as it moves from a GitHub signal to a reviewed contribution.</p>
          </div>
          <div className="room-clock">
            <span><Clock3 size={14} /> {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}</span>
            <small>Asia/Kolkata · simulated telemetry</small>
          </div>
        </section>

        <section className="metric-strip" aria-label="Runtime summary">
          <div><span className="metric-icon metric-green"><Activity size={17} /></span><span><small>Agents awake</small><strong>{activeCount} <em>/ {agents.length}</em></strong></span></div>
          <div><span className="metric-icon metric-red"><TerminalSquare size={17} /></span><span><small>Active run</small><strong>8f24b <em>· 04:16</em></strong></span></div>
          <div><span className="metric-icon metric-blue"><Cloud size={17} /></span><span><small>Room memory</small><strong>{totalMemory} <em>MB</em></strong></span></div>
          <div><span className="metric-icon metric-amber"><Sparkles size={17} /></span><span><small>Token flow</small><strong>{formatTokens(totalTokens)} <em>today</em></strong></span></div>
          <div><span className="metric-icon metric-violet"><CircleCheck size={17} /></span><span><small>Success rate</small><strong>94.2 <em>%</em></strong></span></div>
        </section>

        <div className={`workspace-grid ${selectedId ? "" : "inspector-closed"}`}>
          <section className="agent-room" aria-label="Agent operations room">
            <div className="room-toolbar">
              <div><span className="live-ring" /><strong>Operations floor</strong><small>data moving now</small></div>
              <div className="room-legend"><span><i className="legend-work" /> working</span><span><i className="legend-watch" /> watching</span><span><i className="legend-sleep" /> sleeping</span></div>
            </div>

            <div className="room-floor">
              {zones.map((zone, zoneIndex) => (
                <div className={`agent-zone zone-${zone.id}`} key={zone.id}>
                  <div className="zone-heading"><span>{zone.label}</span><small>{zone.hint}</small></div>
                  <div className="zone-agents">
                    {agents.filter((agent) => agent.zone === zone.id).map((agent) => (
                      <AgentCard key={agent.id} agent={agent} selected={agent.id === selectedId} onSelect={() => setSelectedId(agent.id)} />
                    ))}
                  </div>
                  {zoneIndex < zones.length - 1 && <RoomConnector />}
                </div>
              ))}
            </div>

            <div className="flow-footer">
              <div className="flow-source"><GitBranch size={15} /><span><strong>GitHub signal</strong><small>webhook · polling</small></span></div>
              <div className="flow-track"><span /><span /><span /><span /><span /></div>
              <div className="flow-source flow-destination"><CircleCheck size={15} /><span><strong>Contribution</strong><small>PR · board · discussion</small></span></div>
            </div>
          </section>

          {selectedId && <aside className="agent-inspector" aria-live="polite">
            <div className="inspector-head">
              <div className="inspector-agent">
                <span className="inspector-icon"><SelectedIcon size={21} /></span>
                <span><small>Agent detail</small><strong>{selected.name}</strong></span>
              </div>
              <button type="button" aria-label="Close agent details" onClick={() => setSelectedId(null)}><X size={17} /></button>
            </div>
            <div className="inspector-status"><StatusMark status={selected.status} /><span>updated just now</span></div>
            <div className="inspector-section current-work">
              <span className="section-label">Current assignment</span>
              <strong>{selected.activity}</strong>
              <p>{selected.detail}</p>
              <div className="task-chip"><GitBranch size={13} /> {selected.task}</div>
            </div>
            <div className="inspector-grid">
              <div><small>Memory</small><strong>{selected.memory} MB</strong><span className="mini-meter"><i style={{ width: `${Math.min(selected.memory / 8, 100)}%` }} /></span></div>
              <div><small>Tokens</small><strong>{formatTokens(selected.tokens)}</strong><span className="mini-meter token-meter"><i style={{ width: `${Math.min(selected.tokens / 600, 100)}%` }} /></span></div>
              <div><small>Runtime</small><strong>{selected.elapsed}</strong><span>current cycle</span></div>
              <div><small>Route</small><strong className="model-name">{selected.model}</strong><span>least-cost fit</span></div>
            </div>
            <div className="inspector-section">
              <div className="section-heading"><span className="section-label">Latest logs</span><button type="button">View all</button></div>
              <div className="log-list">
                {selected.logs.map((log, index) => (
                  <div key={log}><span>{index === selected.logs.length - 1 ? "now" : `${(selected.logs.length - index) * 7}s`}</span><p>{log}</p></div>
                ))}
              </div>
            </div>
            <div className="doctor-note">
              <HeartPulse size={16} />
              <span><strong>Doctor says this run is healthy.</strong><small>No loops, memory pressure, or abnormal token growth.</small></span>
            </div>
          </aside>}
        </div>

        <section className="activity-dock">
          <div className="dock-heading"><span><Users size={16} /><strong>Room activity</strong></span><button type="button">Open run history <ChevronRight size={14} /></button></div>
          <div className="activity-list">
            <div><span className="activity-avatar avatar-solve"><Code2 size={15} /></span><p><strong>Solve</strong> changed <code>analytics.tsx</code><small>12 seconds ago</small></p><span className="activity-tag">edit</span></div>
            <div><span className="activity-avatar avatar-doctor"><HeartPulse size={15} /></span><p><strong>Doctor</strong> sampled runtime health<small>18 seconds ago</small></p><span className="activity-tag tag-safe">healthy</span></div>
            <div><span className="activity-avatar avatar-triage"><ListChecks size={15} /></span><p><strong>Triage</strong> sent a candidate to Vet<small>31 seconds ago</small></p><span className="activity-tag tag-route">handoff</span></div>
            <div><span className="activity-avatar avatar-project"><Box size={15} /></span><p><strong>Project</strong> synchronized phase metadata<small>46 seconds ago</small></p><span className="activity-tag tag-sync">sync</span></div>
          </div>
        </section>
      </main>
    </div>
  );
}
