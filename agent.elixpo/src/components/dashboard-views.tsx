import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Box,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  GitPullRequest,
  Github,
  Layers3,
  MemoryStick,
  MessageSquareText,
  Play,
  Radio,
  Route,
  ShieldCheck,
  Workflow,
  XCircle,
} from "lucide-react";
import {
  floors,
  type DashboardRun,
  type DashboardSnapshot,
  type DashboardWorkItem,
  type FloorDefinition,
  type StateReceipt,
} from "@/lib/github-dashboard";

function time(value: string) {
  if (!value) return "Time not reported";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function status(run: DashboardRun) {
  return run.status === "completed" ? run.conclusion || "completed" : run.status;
}

function runTone(run: DashboardRun) {
  const value = status(run);
  if (value === "success") return "success";
  if (["failure", "timed_out", "cancelled", "action_required"].includes(value)) return "danger";
  if (run.status === "in_progress") return "live";
  return "neutral";
}

function receiptTone(receipt: StateReceipt) {
  if (["complete", "submitted", "approved", "picked"].includes(receipt.status)) return "success";
  if (["failed", "rejected", "terminated", "terminate"].includes(receipt.status)) return "danger";
  return "neutral";
}

function FloorIcon({ slug }: { slug: FloorDefinition["slug"] }) {
  if (slug === "operations") return <Route size={20} />;
  if (slug === "discussions") return <MessageSquareText size={20} />;
  return <Bot size={20} />;
}

function PageHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="real-page-heading">
      <div><span className="real-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>
    </div>
  );
}

function WarningStrip({ snapshot }: { snapshot: DashboardSnapshot }) {
  if (!snapshot.warnings.length) return null;
  return (
    <section className="source-warning">
      <AlertTriangle size={18} />
      <div><strong>Some GitHub sources were unavailable</strong>{snapshot.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="truthful-empty"><Box size={22} /><p>{children}</p></div>;
}

function RunRow({ run }: { run: DashboardRun }) {
  const tone = runTone(run);
  return (
    <a className="real-run-row" href={run.url} target="_blank" rel="noreferrer">
      <span className={`real-status-icon tone-${tone}`}>
        {tone === "success" ? <CheckCircle2 size={18} /> : tone === "danger" ? <XCircle size={18} /> : <CircleDot size={18} />}
      </span>
      <span className="real-run-main"><strong>{run.name}</strong><small>{run.event} · {run.branch} · attempt {run.attempt}</small></span>
      <span className="real-run-actor">{run.actor}</span>
      <span className={`real-badge tone-${tone}`}>{status(run)}</span>
      <span className="real-run-time">{time(run.updatedAt)}</span>
      <ExternalLink size={15} />
    </a>
  );
}

function WorkRow({ item }: { item: DashboardWorkItem }) {
  const state = item.mergedAt ? "merged" : item.draft ? "draft" : item.state;
  return (
    <a className="real-work-row" href={item.url} target="_blank" rel="noreferrer">
      <span className={item.kind === "pull_request" ? "work-icon-pr" : "work-icon-issue"}>
        {item.kind === "pull_request" ? <GitPullRequest size={19} /> : <CircleDot size={19} />}
      </span>
      <span className="real-work-main"><strong>{item.title}</strong><small>{item.kind === "pull_request" ? "Pull request" : "Issue"} #{item.number} · {item.author}</small></span>
      <span className="work-labels">{item.labels.slice(0, 2).map((label) => <i key={label}>{label}</i>)}</span>
      <span className="real-badge tone-neutral">{state}</span>
      <span className="real-run-time">{time(item.updatedAt)}</span>
      <ExternalLink size={15} />
    </a>
  );
}

function RepositorySource({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <a className="repository-source" href={snapshot.repository.url} target="_blank" rel="noreferrer">
      {snapshot.repository.avatarUrl ? <Image src={snapshot.repository.avatarUrl} alt="" width={44} height={44} /> : <Github size={32} />}
      <span><small>Control repository</small><strong>{snapshot.repository.fullName}</strong><em>{snapshot.repository.description || "No repository description"}</em></span>
      <ExternalLink size={17} />
    </a>
  );
}

export function BuildingDashboard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const active = snapshot.runs.filter((run) => run.status === "in_progress" || run.status === "queued");
  const failed = snapshot.runs.filter((run) => ["failure", "timed_out", "action_required"].includes(run.conclusion || ""));
  const openWork = snapshot.work.filter((item) => item.state === "open");
  const seenWorkflows = new Set<string>();
  const runtimeRoute = [...active, ...snapshot.runs].filter((run) => {
    const key = run.name.toLowerCase();
    if (seenWorkflows.has(key)) return false;
    seenWorkflows.add(key);
    return true;
  }).slice(0, 6);
  const securityWatch = snapshot.security.slice(0, 3);

  return (
    <main className="real-page">
      <PageHeading eyebrow="Live control plane" title="Agent operations building" copy="Rooms and activity are reconstructed from GitHub Actions and committed state receipts." />
      <WarningStrip snapshot={snapshot} />
      <section className="real-metrics">
        <div><Play /><span><small>Active runs</small><strong>{active.length}</strong></span></div>
        <div><Layers3 /><span><small>Operational floors</small><strong>{floors.length}</strong></span></div>
        <div><GitPullRequest /><span><small>Open work</small><strong>{openWork.length}</strong></span></div>
        <div><AlertTriangle /><span><small>Failed runs in feed</small><strong>{failed.length}</strong></span></div>
      </section>

      <div className="real-building-grid">
        <section className="real-panel building-visual-card">
          <div className="real-panel-head"><div><small>Isometric directory</small><h2>Three floors, one GitHub record</h2></div><span className="source-pill"><Radio size={13} /> refreshed {time(snapshot.generatedAt)}</span></div>
          <div className="cubic-building-zone">
            <div className="real-building" aria-label="Agent operations floors">
              {[...floors].reverse().map((floor, index) => {
                const floorRuns = snapshot.runs.filter((run) => run.floor === floor.slug);
                const live = floorRuns.filter((run) => run.status === "in_progress" || run.status === "queued").length;
                return (
                  <Link className="real-floor-slab" href={`/${floor.slug}`} key={floor.slug} style={{ "--floor-accent": floor.accent, "--floor-index": index } as React.CSSProperties}>
                    <span className="cube-floor-face cube-floor-front">
                      <span className="slab-level">{floor.level}</span>
                      <span className="slab-copy"><strong>{floor.name}</strong><small>{live ? `${live} active` : `${floorRuns.length} recent runs`}</small></span>
                      <ArrowRight size={18} />
                    </span>
                    <span className="cube-floor-face cube-floor-top" aria-hidden="true" />
                    <span className="cube-floor-face cube-floor-side" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
            <aside className="security-observatory">
              <header><span><ShieldCheck size={17} /> Security watch</span><Link href="/alerts">Open <ArrowRight size={13} /></Link></header>
              {securityWatch.length ? securityWatch.map((event) => (
                <div className="observatory-event" key={event.id}>
                  <i className={`tone-${event.level === "critical" ? "danger" : event.level}`} />
                  <span><strong>{event.title}</strong><small>{event.detail}</small><em>{time(event.occurredAt)}</em></span>
                </div>
              )) : <p>No security activity returned by GitHub.</p>}
            </aside>
          </div>
          <div className="building-source-note"><Workflow size={17} /><span>Workflow run status is live. Room memory is not exposed by GitHub Actions and is never estimated.</span></div>
          <div className="runtime-rail">
            <header><span><Activity size={16} /> Current runtime flow</span><small>Active first, then latest GitHub updates</small></header>
            {runtimeRoute.length ? <div className="runtime-route">
              {runtimeRoute.map((run, index) => (
                <div className="runtime-hop" key={run.id}>
                  <a href={run.url} target="_blank" rel="noreferrer">
                    <span className={`runtime-node tone-${runTone(run)}`}><Workflow size={15} /></span>
                    <span><strong>{run.name}</strong><small>{status(run)} · {run.branch}</small></span>
                  </a>
                  {index < runtimeRoute.length - 1 && <ArrowRight className="runtime-arrow" size={16} />}
                </div>
              ))}
            </div> : <p className="runtime-empty">No workflow route was returned by GitHub.</p>}
          </div>
        </section>

        <section className="real-panel floor-summary-card">
          <div className="real-panel-head"><div><small>Floor directory</small><h2>Operational domains</h2></div><Link href="/floors">Open directory <ArrowRight size={15} /></Link></div>
          <div className="real-floor-list">
            {floors.map((floor) => {
              const floorRuns = snapshot.runs.filter((run) => run.floor === floor.slug);
              return <Link href={`/${floor.slug}`} key={floor.slug}><span style={{ color: floor.accent }}><FloorIcon slug={floor.slug} /></span><span><strong>{floor.name}</strong><small>{floor.description}</small></span><b>{floorRuns.length}</b></Link>;
            })}
          </div>
        </section>

        <section className="real-panel security-card">
          <div className="real-panel-head"><div><small>Building security</small><h2>Latest activity</h2></div><Link href="/alerts">All alerts <ArrowRight size={15} /></Link></div>
          {snapshot.security.length ? <div className="security-feed">{snapshot.security.slice(0, 5).map((event) => <div key={event.id}><span className={`security-dot tone-${event.level === "critical" ? "danger" : event.level}`} /><span><strong>{event.title}</strong><small>{event.detail}</small><em>{event.source} · {time(event.occurredAt)}</em></span></div>)}</div> : <Empty>No security workflow activity was returned by GitHub.</Empty>}
        </section>

        <section className="real-panel recent-runs-card">
          <div className="real-panel-head"><div><small>Runtime stream</small><h2>Latest routes</h2></div><Link href="/runs">All runs <ArrowRight size={15} /></Link></div>
          <div className="real-table">{snapshot.runs.length ? snapshot.runs.slice(0, 6).map((run) => <RunRow run={run} key={run.id} />) : <Empty>No workflow runs were returned by GitHub.</Empty>}</div>
        </section>

        <section className="real-panel source-card"><RepositorySource snapshot={snapshot} /></section>
      </div>
    </main>
  );
}

export function FloorDirectoryView({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <main className="real-page">
      <PageHeading eyebrow="Building directory" title="Floor directory" copy="Each floor is a real operational slice of the control repository's workflow history." />
      <WarningStrip snapshot={snapshot} />
      <div className="directory-grid">
        {floors.map((floor) => {
          const runs = snapshot.runs.filter((run) => run.floor === floor.slug);
          const active = runs.filter((run) => run.status !== "completed").length;
          const lastRun = runs[0];
          return (
            <Link className="directory-card" href={`/${floor.slug}`} key={floor.slug} style={{ "--floor-accent": floor.accent } as React.CSSProperties}>
              <div className="directory-number">{floor.level}</div>
              <span className="directory-icon"><FloorIcon slug={floor.slug} /></span>
              <h2>{floor.name}</h2><p>{floor.description}</p>
              <div className="directory-stats"><span><strong>{runs.length}</strong><small>runs in current feed</small></span><span><strong>{active}</strong><small>active now</small></span></div>
              <footer><span>{lastRun ? `Last: ${time(lastRun.updatedAt)}` : "No workflow run returned"}</span><ArrowRight size={18} /></footer>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

export function FloorView({ snapshot, floor }: { snapshot: DashboardSnapshot; floor: FloorDefinition }) {
  const runs = snapshot.runs.filter((run) => run.floor === floor.slug);
  const receipts = floor.slug === "oreoflow" ? snapshot.receipts : [];
  const active = runs.filter((run) => run.status !== "completed");
  return (
    <main className="real-page">
      <div className="floor-route-heading" style={{ "--floor-accent": floor.accent } as React.CSSProperties}>
        <Link href="/floors">Floor directory</Link>
        <span className="floor-route-level">{floor.level}</span>
        <div><span className="real-eyebrow">Operational floor</span><h1>{floor.name}</h1><p>{floor.description}</p></div>
      </div>
      <WarningStrip snapshot={snapshot} />
      <section className="real-metrics floor-route-metrics">
        <div><Activity /><span><small>Runs returned</small><strong>{runs.length}</strong></span></div>
        <div><Radio /><span><small>Active now</small><strong>{active.length}</strong></span></div>
        <div><Clock3 /><span><small>Latest activity</small><strong className="metric-date">{runs[0] ? time(runs[0].updatedAt) : "None"}</strong></span></div>
        <div><MemoryStick /><span><small>Runtime memory</small><strong className="metric-date">Not reported</strong></span></div>
      </section>
      <div className="floor-route-grid">
        <section className="real-panel floor-runs-panel">
          <div className="real-panel-head"><div><small>Rooms</small><h2>Workflow runs on this floor</h2></div><span>{active.length} active</span></div>
          <div className="real-table">{runs.length ? runs.map((run) => <RunRow run={run} key={run.id} />) : <Empty>No workflow runs are currently classified on this floor.</Empty>}</div>
        </section>
        <aside className="real-panel floor-inspector">
          <div className="real-panel-head"><div><small>Agent telemetry</small><h2>What GitHub reports</h2></div></div>
          <dl><div><dt>Status</dt><dd>Actions run status</dd></div><div><dt>Logs</dt><dd>Available through each run link</dd></div><div><dt>Token use</dt><dd>{receipts.some((r) => r.tokenSpent !== null) ? "From state receipts" : "Not reported for this floor"}</dd></div><div><dt>Memory</dt><dd>Not reported by GitHub Actions</dd></div></dl>
          {receipts.length > 0 && <div className="receipt-stack"><h3>Latest state receipts</h3>{receipts.map((receipt) => <div key={receipt.name}><span className={`real-badge tone-${receiptTone(receipt)}`}>{receipt.status}</span><strong>{receipt.name} · {receipt.stage}</strong><small>{receipt.tokenSpent !== null ? `${receipt.tokenSpent.toLocaleString()} tokens` : "Token use not reported"}</small></div>)}</div>}
        </aside>
      </div>
    </main>
  );
}

export function RunsView({ snapshot }: { snapshot: DashboardSnapshot }) {
  return <main className="real-page"><PageHeading eyebrow="GitHub Actions" title="Runs" copy="Workflow execution status, actors, branches, attempts, and direct log links from GitHub." /><WarningStrip snapshot={snapshot} /><section className="real-panel full-list-panel"><div className="real-panel-head"><div><small>{snapshot.repository.fullName}</small><h2>Latest workflow runs</h2></div><span>{snapshot.runs.length} returned</span></div><div className="real-table">{snapshot.runs.length ? snapshot.runs.map((run) => <RunRow run={run} key={run.id} />) : <Empty>No workflow runs were returned by GitHub.</Empty>}</div></section></main>;
}

export function WorkView({ snapshot }: { snapshot: DashboardSnapshot }) {
  return <main className="real-page"><PageHeading eyebrow="GitHub work queue" title="Work" copy="Real issues and pull requests from the control repository, ordered by GitHub update time." /><WarningStrip snapshot={snapshot} /><section className="real-panel full-list-panel"><div className="real-panel-head"><div><small>{snapshot.repository.fullName}</small><h2>Issues and pull requests</h2></div><span>{snapshot.work.length} returned</span></div><div className="real-table">{snapshot.work.length ? snapshot.work.map((item) => <WorkRow item={item} key={`${item.kind}-${item.id}`} />) : <Empty>No issues or pull requests were returned by GitHub.</Empty>}</div></section></main>;
}

export function AlertsView({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <main className="real-page"><PageHeading eyebrow="Guard desk" title="Building security" copy="Security workflow activity, failed Actions runs, and Doctor or Janitor decisions from committed receipts." /><WarningStrip snapshot={snapshot} />
      <div className="alerts-grid"><section className="real-panel full-list-panel"><div className="real-panel-head"><div><small>Evidence feed</small><h2>Alerts and guard activity</h2></div><span>{snapshot.security.length} events</span></div>{snapshot.security.length ? <div className="alerts-feed">{snapshot.security.map((event) => <a href={event.url || undefined} target={event.url ? "_blank" : undefined} rel={event.url ? "noreferrer" : undefined} key={event.id}><span className={`alert-icon tone-${event.level === "critical" ? "danger" : event.level}`}>{event.level === "success" ? <ShieldCheck /> : <AlertTriangle />}</span><span><strong>{event.title}</strong><p>{event.detail}</p><small>{event.source} · {time(event.occurredAt)}</small></span>{event.url && <ExternalLink size={16} />}</a>)}</div> : <Empty>No security events were returned by GitHub or committed state receipts.</Empty>}</section>
      <aside className="real-panel evidence-card"><ShieldCheck size={28} /><h2>Evidence policy</h2><p>This page does not infer vulnerabilities or runtime health. It reports failed runs, security workflow runs, and durable Doctor or Janitor decisions.</p><dl><div><dt>RAM</dt><dd>Not reported</dd></div><div><dt>Workflow logs</dt><dd>Linked from GitHub</dd></div><div><dt>Receipts</dt><dd>Committed state JSON</dd></div></dl></aside></div>
    </main>
  );
}
