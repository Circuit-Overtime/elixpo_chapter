"use client";

import Image from "next/image";
import {
  Activity,
  Archive,
  ArrowLeft,
  BellRing,
  Bot,
  Box,
  Building2,
  ChevronRight,
  CircleCheck,
  CircleDot,
  Clock3,
  Cloud,
  Code2,
  Database,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Globe2,
  HeartPulse,
  Layers3,
  ListChecks,
  MessageSquareText,
  Network,
  PackageCheck,
  Radio,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildingCommunications,
  buildingFloors,
  type AgentIcon,
  type AgentSnapshot,
  type AgentStatus,
  type AgentZone,
  type CommunicationSnapshot,
  type FloorId,
  type FloorSnapshot,
  type RoomStatus,
} from "@/lib/building-simulation";

const iconMap: Record<AgentIcon, LucideIcon> = {
  archive: Archive,
  bot: Bot,
  box: Box,
  carrier: PackageCheck,
  code: Code2,
  database: Database,
  doctor: HeartPulse,
  discussion: MessageSquareText,
  globe: Globe2,
  guard: ShieldCheck,
  pick: CircleDot,
  project: GitPullRequest,
  publish: GitBranch,
  route: Route,
  search: Search,
  triage: ListChecks,
  vet: ShieldCheck,
};

const statusLabel: Record<AgentStatus, string> = {
  working: "Working",
  watching: "Watching",
  waiting: "Standby",
  sleeping: "Sleeping",
};

const roomStatusLabel: Record<RoomStatus, string> = {
  active: "Active",
  queued: "Queued",
  completed: "Complete",
  guarded: "Guarded",
};

const zones: Array<{ id: AgentZone; label: string; hint: string }> = [
  { id: "intake", label: "Intake", hint: "receive · qualify" },
  { id: "workshop", label: "Workshop", hint: "research · build" },
  { id: "control", label: "Control", hint: "protect · supervise" },
  { id: "output", label: "Outbound", hint: "carry · publish" },
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

function RoomStatusMark({ status }: { status: RoomStatus }) {
  return (
    <span className={`room-status room-status-${status}`}>
      <span />
      {roomStatusLabel[status]}
    </span>
  );
}

function FlowState({ state }: { state: CommunicationSnapshot["state"] }) {
  return <span className={`flow-state flow-state-${state}`}>{state}</span>;
}

function BuildingModel({ onOpenFloor }: { onOpenFloor: (floor: FloorId) => void }) {
  const shapes = [
    { floor: buildingFloors[2], top: "300,72 474,157 300,242 126,157", front: "126,157 300,242 300,276 126,191", side: "300,242 474,157 474,191 300,276", y: 157 },
    { floor: buildingFloors[1], top: "300,184 498,281 300,378 102,281", front: "102,281 300,378 300,417 102,320", side: "300,378 498,281 498,320 300,417", y: 281 },
    { floor: buildingFloors[0], top: "300,323 530,435 300,547 70,435", front: "70,435 300,547 300,591 70,479", side: "300,547 530,435 530,479 300,591", y: 435 },
  ];

  return (
    <div className="iso-wrap">
      <div className="building-beacon"><Radio size={14} /><span>live building</span></div>
      <svg className="iso-building" viewBox="0 0 700 650" role="img" aria-label="Three-floor Elixpo agent operations building">
        <defs>
          <filter id="floorShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#211a15" floodOpacity=".13" />
          </filter>
          <linearGradient id="carrierBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7856c8" />
            <stop offset=".52" stopColor="#e53935" />
            <stop offset="1" stopColor="#3975d5" />
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="575" rx="260" ry="58" fill="#ded8d1" opacity=".45" />
        <path d="M300 114 L300 534" stroke="url(#carrierBeam)" strokeWidth="3" strokeDasharray="5 9" opacity=".75" />
        <circle className="iso-packet packet-a" cx="300" cy="114" r="7" fill="#e53935" />
        <circle className="iso-packet packet-b" cx="300" cy="114" r="5" fill="#3975d5" />
        {shapes.map(({ floor, top, front, side, y }, index) => (
          <g
            className={`iso-floor iso-floor-${floor.id}`}
            key={floor.id}
            onClick={() => onOpenFloor(floor.id)}
            onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onOpenFloor(floor.id)}
            role="button"
            tabIndex={0}
            aria-label={`Open ${floor.name}`}
            filter="url(#floorShadow)"
          >
            <polygon points={front} className="iso-front" style={{ fill: floor.accent }} />
            <polygon points={side} className="iso-side" style={{ fill: floor.accent }} />
            <polygon points={top} className="iso-top" />
            <g className="iso-room-lights">
              <rect x={index === 0 ? 245 : 210} y={y - 20} width="30" height="12" rx="4" />
              <rect x={index === 0 ? 290 : 275} y={y + 1} width="30" height="12" rx="4" />
              <rect x={index === 0 ? 335 : 340} y={y - 20} width="30" height="12" rx="4" />
            </g>
          </g>
        ))}
        {shapes.map(({ floor }, index) => (
          <g className="iso-label" key={`${floor.id}-label`} onClick={() => onOpenFloor(floor.id)}>
            <line x1="505" y1={index === 0 ? 156 : index === 1 ? 280 : 434} x2="570" y2={index === 0 ? 156 : index === 1 ? 280 : 434} />
            <circle cx="505" cy={index === 0 ? 156 : index === 1 ? 280 : 434} r="4" style={{ fill: floor.accent }} />
            <text x="581" y={index === 0 ? 151 : index === 1 ? 275 : 429} className="iso-level-label">{floor.level}</text>
            <text x="581" y={index === 0 ? 168 : index === 1 ? 292 : 446} className="iso-floor-label">{floor.name}</text>
          </g>
        ))}
      </svg>
      <div className="iso-caption"><Network size={13} /><span>Carrier lane</span><small>typed tasks · artifacts · receipts</small></div>
    </div>
  );
}

function CommunicationList({ items, compact = false }: { items: CommunicationSnapshot[]; compact?: boolean }) {
  return (
    <div className={`communication-list ${compact ? "communication-list-compact" : ""}`}>
      {items.map((item) => (
        <div className="communication-row" key={item.id}>
          <span className={`communication-symbol communication-${item.state}`}><ChevronRight size={12} /></span>
          <div className="communication-route">
            <span><strong>{item.from}</strong><ChevronRight size={10} /><strong>{item.to}</strong></span>
            <p>{item.detail}</p>
          </div>
          <div className="communication-meta"><FlowState state={item.state} /><small>{item.age}</small></div>
        </div>
      ))}
    </div>
  );
}

function BuildingOverview({ onOpenFloor }: { onOpenFloor: (floor: FloorId) => void }) {
  const rooms = buildingFloors.flatMap((floor) => floor.rooms.map((room) => ({ floor, room })));
  const activeRooms = rooms.filter(({ room }) => room.status === "active");

  return (
    <div className="building-bento">
      <section className="bento-card building-card">
        <div className="bento-head">
          <div><span className="eyebrow">Building topology</span><h2>Elixpo agent operations</h2><p>Click any floor to enter its rooms.</p></div>
          <span className="simulation-pill"><span /> simulation live</span>
        </div>
        <BuildingModel onOpenFloor={onOpenFloor} />
      </section>

      <section className="bento-card building-summary-card">
        <div className="small-card-head"><span><Layers3 size={15} /> Building load</span><small>now</small></div>
        <div className="building-number"><strong>{activeRooms.length}</strong><span>active rooms<br />across {buildingFloors.length} floors</span></div>
        <div className="capacity-bars">
          {buildingFloors.map((floor) => {
            const active = floor.rooms.filter((room) => room.status === "active").length;
            return <div key={floor.id}><span>{floor.level} · {floor.name}<small>{active}/{floor.id === "oreoflow" ? 2 : floor.rooms.length}</small></span><i><b style={{ width: `${Math.max(8, (active / Math.max(floor.rooms.length, 1)) * 100)}%`, background: floor.accent }} /></i></div>;
          })}
        </div>
      </section>

      <section className="bento-card building-health-card">
        <div className="small-card-head"><span><ShieldCheck size={15} /> Building guard</span><span className="healthy-label">healthy</span></div>
        <div className="guard-orbit">
          <span className="guard-core"><ShieldCheck size={23} /></span>
          <span className="orbit orbit-one"><HeartPulse size={12} /></span>
          <span className="orbit orbit-two"><Archive size={12} /></span>
          <span className="orbit orbit-three"><PackageCheck size={12} /></span>
        </div>
        <p>Security, Doctors, Janitors, and Carriers are present on every occupied floor.</p>
      </section>

      <section className="bento-card floor-directory-card">
        <div className="small-card-head"><span><Building2 size={15} /> Floor directory</span><small>3 online</small></div>
        <div className="floor-directory">
          {buildingFloors.slice().reverse().map((floor) => (
            <button type="button" key={floor.id} onClick={() => onOpenFloor(floor.id)}>
              <span className="floor-level" style={{ color: floor.accent }}>{floor.level}</span>
              <span><strong>{floor.name}</strong><small>{floor.subtitle}</small></span>
              <span className="floor-room-count">{floor.rooms.length} rooms</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </section>

      <section className="bento-card carrier-card">
        <div className="small-card-head"><span><PackageCheck size={15} /> Between floors</span><span className="moving-label"><span /> 2 moving</span></div>
        <CommunicationList items={buildingCommunications} compact />
      </section>

      <section className="bento-card active-rooms-card">
        <div className="small-card-head"><span><Radio size={15} /> Rooms in motion</span><button type="button">View all <ChevronRight size={13} /></button></div>
        <div className="active-room-grid">
          {activeRooms.map(({ floor, room }) => (
            <button type="button" key={room.id} onClick={() => onOpenFloor(floor.id)}>
              <span className="active-room-floor" style={{ background: `${floor.accent}14`, color: floor.accent }}>{floor.level}</span>
              <span><strong>{room.name}</strong><small>{room.subject}</small></span>
              <span className="room-progress"><i><b style={{ width: `${room.progress}%`, background: floor.accent }} /></i><small>{room.progress}%</small></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function AgentCard({ agent, selected, onSelect }: { agent: AgentSnapshot; selected: boolean; onSelect: () => void }) {
  const Icon = iconMap[agent.icon];
  return (
    <button type="button" className={`agent-card ${selected ? "agent-card-selected" : ""}`} onClick={onSelect} aria-label={`Inspect ${agent.name}`} aria-pressed={selected}>
      <span className="agent-card-top"><span className="agent-icon"><Icon size={17} strokeWidth={1.8} /></span><StatusMark status={agent.status} /></span>
      <span className="agent-name-row"><span><strong>{agent.name}</strong><small>{agent.role}</small></span><ChevronRight size={16} className="agent-chevron" /></span>
      <span className="agent-task">{agent.activity}</span>
      <span className="agent-stats"><span><Activity size={12} /> {agent.memory} MB</span><span><Sparkles size={12} /> {formatTokens(agent.tokens)}</span></span>
    </button>
  );
}

function RoomConnector() {
  return <div className="room-connector" aria-hidden="true"><span className="connector-line" /><span className="data-packet packet-one" /><span className="data-packet packet-two" /><ChevronRight size={15} /></div>;
}

function AgentInspector({ agent, onClose }: { agent: AgentSnapshot; onClose: () => void }) {
  const Icon = iconMap[agent.icon];
  return (
    <aside className="agent-inspector" aria-live="polite">
      <div className="inspector-head"><div className="inspector-agent"><span className="inspector-icon"><Icon size={21} /></span><span><small>Resident detail</small><strong>{agent.name}</strong></span></div><button type="button" aria-label="Close agent details" onClick={onClose}><X size={17} /></button></div>
      <div className="inspector-status"><StatusMark status={agent.status} /><span>updated just now</span></div>
      <div className="inspector-section current-work"><span className="section-label">Current assignment</span><strong>{agent.activity}</strong><p>{agent.detail}</p><div className="task-chip"><GitBranch size={13} /> {agent.task}</div></div>
      <div className="inspector-grid">
        <div><small>Memory</small><strong>{agent.memory} MB</strong><span className="mini-meter"><i style={{ width: `${Math.min(agent.memory / 8, 100)}%` }} /></span></div>
        <div><small>Tokens</small><strong>{formatTokens(agent.tokens)}</strong><span className="mini-meter token-meter"><i style={{ width: `${Math.min(agent.tokens / 600, 100)}%` }} /></span></div>
        <div><small>Runtime</small><strong>{agent.elapsed}</strong><span>current cycle</span></div>
        <div><small>Route</small><strong className="model-name">{agent.model}</strong><span>least-cost fit</span></div>
      </div>
      <div className="inspector-section"><div className="section-heading"><span className="section-label">Latest logs</span><button type="button">View all</button></div><div className="log-list">{agent.logs.map((log, index) => <div key={log}><span>{index === agent.logs.length - 1 ? "now" : `${(agent.logs.length - index) * 7}s`}</span><p>{log}</p></div>)}</div></div>
      <div className="doctor-note"><HeartPulse size={16} /><span><strong>Room Doctor reports healthy.</strong><small>No loops, memory pressure, or abnormal token growth.</small></span></div>
    </aside>
  );
}

function FloorView({ floor, selectedRoomId, onSelectRoom, onBack }: { floor: FloorSnapshot; selectedRoomId: string; onSelectRoom: (roomId: string) => void; onBack: () => void }) {
  const room = floor.rooms.find((candidate) => candidate.id === selectedRoomId) ?? floor.rooms[0];
  const [selectedAgents, setSelectedAgents] = useState<Record<string, string | null>>({});
  const selectedAgentId = Object.prototype.hasOwnProperty.call(selectedAgents, room.id)
    ? selectedAgents[room.id]
    : room.agents.find((agent) => agent.status === "working")?.id ?? room.agents[0]?.id ?? null;
  const selectedAgent = room.agents.find((agent) => agent.id === selectedAgentId) ?? null;
  const activeAgents = room.agents.filter((agent) => agent.status === "working").length;
  const memory = room.agents.reduce((sum, agent) => sum + agent.memory, 0);
  const tokens = room.agents.reduce((sum, agent) => sum + agent.tokens, 0);

  return (
    <>
      <section className="floor-heading">
        <div className="floor-heading-main"><button type="button" onClick={onBack}><ArrowLeft size={15} /> Building</button><span className="floor-index" style={{ background: floor.accent }}>{floor.level}</span><div><span className="eyebrow" style={{ color: floor.accent }}>Floor {floor.level} / {floor.subtitle}</span><h1>{floor.name}</h1><p>{floor.description}</p></div></div>
        <div className="floor-capacity"><span><strong>{floor.rooms.filter((candidate) => candidate.status === "active").length}</strong> active</span><span><strong>{floor.rooms.length}</strong> rooms</span><span><strong>{floor.rooms.reduce((sum, candidate) => sum + candidate.agents.length, 0)}</strong> residents</span></div>
      </section>

      <section className="room-switcher" aria-label="Rooms on this floor">
        {floor.rooms.map((candidate) => (
          <button type="button" key={candidate.id} className={candidate.id === room.id ? "room-tab-active" : ""} onClick={() => onSelectRoom(candidate.id)} style={{ "--floor-accent": floor.accent } as React.CSSProperties}>
            <span className="room-tab-top"><RoomStatusMark status={candidate.status} /><small>{candidate.started}</small></span>
            <strong>{candidate.name}</strong><span>{candidate.subject}</span>
            <span className="room-tab-bottom"><i><b style={{ width: `${candidate.progress}%`, background: floor.accent }} /></i><small>{candidate.progress}%</small><small>{candidate.agents.length} agents</small></span>
          </button>
        ))}
      </section>

      <section className="metric-strip floor-metrics" aria-label="Room summary">
        <div><span className="metric-icon metric-green"><Activity size={17} /></span><span><small>Agents working</small><strong>{activeAgents} <em>/ {room.agents.length}</em></strong></span></div>
        <div><span className="metric-icon metric-red"><TerminalSquare size={17} /></span><span><small>Room run</small><strong>{room.runId} <em>· {room.started}</em></strong></span></div>
        <div><span className="metric-icon metric-blue"><Cloud size={17} /></span><span><small>Room memory</small><strong>{memory} <em>MB</em></strong></span></div>
        <div><span className="metric-icon metric-amber"><Sparkles size={17} /></span><span><small>Token flow</small><strong>{formatTokens(tokens)} <em>this run</em></strong></span></div>
        <div><span className="metric-icon metric-violet"><Network size={17} /></span><span><small>Handoffs</small><strong>{room.communications.length} <em>tracked</em></strong></span></div>
      </section>

      <div className={`workspace-grid ${selectedAgent ? "" : "inspector-closed"}`}>
        <section className="agent-room" aria-label={`${room.name} agent room`}>
          <div className="room-toolbar"><div><span className="live-ring" /><strong>{room.name}</strong><small>{room.repository} · run {room.runId}</small></div><div className="room-legend"><span><i className="legend-work" /> working</span><span><i className="legend-watch" /> watching</span><span><i className="legend-sleep" /> sleeping</span></div></div>
          <div className="room-floor">
            {zones.map((zone, zoneIndex) => (
              <div className={`agent-zone zone-${zone.id}`} key={zone.id}><div className="zone-heading"><span>{zone.label}</span><small>{zone.hint}</small></div><div className="zone-agents">{room.agents.filter((agent) => agent.zone === zone.id).map((agent) => <AgentCard key={agent.id} agent={agent} selected={agent.id === selectedAgentId} onSelect={() => setSelectedAgents((current) => ({ ...current, [room.id]: agent.id }))} />)}</div>{zoneIndex < zones.length - 1 && <RoomConnector />}</div>
            ))}
          </div>
          <div className="flow-footer"><div className="flow-source"><GitBranch size={15} /><span><strong>Room objective</strong><small>{room.subject}</small></span></div><div className="flow-track"><span /><span /><span /><span /><span /></div><div className="flow-source flow-destination"><CircleCheck size={15} /><span><strong>Room output</strong><small>typed artifact + receipt</small></span></div></div>
        </section>
        {selectedAgent && <AgentInspector agent={selectedAgent} onClose={() => setSelectedAgents((current) => ({ ...current, [room.id]: null }))} />}
      </div>

      <section className="room-comms-card">
        <div className="dock-heading"><span><Network size={16} /><strong>Room communications</strong><small>typed handoffs, not shared prompts</small></span><button type="button">Inspect artifacts <ExternalLink size={13} /></button></div>
        <CommunicationList items={room.communications} />
      </section>
    </>
  );
}

export function AgentRoom() {
  const [selectedFloorId, setSelectedFloorId] = useState<FloorId | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<Record<FloorId, string>>({
    mentions: buildingFloors[0].rooms[0].id,
    oreoflow: buildingFloors[1].rooms[0].id,
    discussions: buildingFloors[2].rooms[0].id,
  });
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedFloor = useMemo(() => buildingFloors.find((floor) => floor.id === selectedFloorId) ?? null, [selectedFloorId]);
  const allRooms = buildingFloors.flatMap((floor) => floor.rooms);
  const allAgents = allRooms.flatMap((room) => room.agents);
  const activeRooms = allRooms.filter((room) => room.status === "active").length;

  return (
    <div className="operations-shell">
      <header className="topbar">
        <button type="button" className="brand-lockup brand-button" onClick={() => setSelectedFloorId(null)}><Image src="/logo.png" alt="OreoFlow" width={34} height={34} className="brand-logo" priority /><span><strong>OreoFlow</strong><small>agent operations building</small></span></button>
        <nav className="topbar-nav" aria-label="Main navigation"><button className="nav-active" type="button" onClick={() => setSelectedFloorId(null)}><Building2 size={15} /> Building</button><button type="button"><ListChecks size={15} /> Runs</button><button type="button"><GitPullRequest size={15} /> Work</button><button type="button"><BellRing size={15} /> Alerts <span className="nav-count">2</span></button></nav>
        <div className="operator-block"><span className="system-live"><span /> Systems live</span><span className="operator-avatar">EB</span><span className="operator-copy"><strong>Operator</strong><small>super-admin preview</small></span></div>
      </header>

      <main className="room-page building-page">
        {!selectedFloor ? (
          <>
            <section className="room-heading building-heading"><div><span className="eyebrow">Elixpo ecosystem / live simulation</span><h1>One building. Many rooms in motion.</h1><p>Enter a floor, switch between concurrent rooms, and follow every typed handoff.</p></div><div className="room-clock"><span><Clock3 size={14} /> {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}</span><small>Asia/Kolkata · simulated telemetry</small></div></section>
            <section className="metric-strip building-metrics" aria-label="Building summary">
              <div><span className="metric-icon metric-green"><Activity size={17} /></span><span><small>Active rooms</small><strong>{activeRooms} <em>/ {allRooms.length}</em></strong></span></div>
              <div><span className="metric-icon metric-red"><Building2 size={17} /></span><span><small>Floors online</small><strong>{buildingFloors.length} <em>systems</em></strong></span></div>
              <div><span className="metric-icon metric-blue"><Users size={17} /></span><span><small>Residents loaded</small><strong>{allAgents.length} <em>agents</em></strong></span></div>
              <div><span className="metric-icon metric-amber"><PackageCheck size={17} /></span><span><small>Carrier traffic</small><strong>2 <em>moving</em></strong></span></div>
              <div><span className="metric-icon metric-violet"><ShieldCheck size={17} /></span><span><small>Security gates</small><strong>100 <em>% healthy</em></strong></span></div>
            </section>
            <BuildingOverview onOpenFloor={setSelectedFloorId} />
          </>
        ) : (
          <FloorView floor={selectedFloor} selectedRoomId={selectedRooms[selectedFloor.id]} onSelectRoom={(roomId) => setSelectedRooms((current) => ({ ...current, [selectedFloor.id]: roomId }))} onBack={() => setSelectedFloorId(null)} />
        )}
      </main>

      <nav className="elevator" aria-label="Building floors">
        <button type="button" className={!selectedFloorId ? "elevator-active" : ""} onClick={() => setSelectedFloorId(null)} aria-label="Building overview"><Building2 size={15} /></button>
        {buildingFloors.slice().reverse().map((floor) => <button type="button" key={floor.id} className={selectedFloorId === floor.id ? "elevator-active" : ""} onClick={() => setSelectedFloorId(floor.id)} aria-label={`Floor ${floor.level}: ${floor.name}`} style={{ "--elevator-accent": floor.accent } as React.CSSProperties}><span>{floor.level}</span><small>{floor.name}</small></button>)}
      </nav>
    </div>
  );
}
