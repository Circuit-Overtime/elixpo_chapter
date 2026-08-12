import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Braces,
  Check,
  CircleDollarSign,
  ExternalLink,
  FileCode2,
  Gauge,
  GitBranch,
  KeyRound,
  Library,
  MessageSquareCode,
  Radio,
  Route,
  ShieldCheck,
  TerminalSquare,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata(
  "OreoFlow Framework Documentation",
  "Install, configure, and integrate the released OreoFlow Python agent runtime.",
  "/docs",
);

const publicApi = [
  ["Router", "Resolves logical roles to models and performs calls or streams."],
  ["Message", "Validated OpenAI-compatible system, user, assistant, and tool messages."],
  ["ToolDef", "OpenAI function-tool declaration. Execution remains application-owned."],
  ["Budget", "In-memory per-task token budget with an absolute runaway ceiling."],
  ["TokenLedger", "Optional append-only JSONL usage records for completed calls."],
  ["LLMClient", "Low-level asynchronous OpenAI-compatible HTTP client with retries."],
  ["Usage", "Prompt, cached, completion, and total token accounting."],
  ["Effort", "Low, medium, or high effort mapped to controlled temperatures."],
];

const ownership = [
  ["Provider HTTP, retries, validation", "OreoFlow"],
  ["Logical role → model", "OreoFlow + application YAML"],
  ["Streaming provider chunks", "OreoFlow"],
  ["Agent selection and prompts", "Application"],
  ["Skills and tool execution", "Application"],
  ["Sessions and response IDs", "Application"],
  ["Redis and Qdrant memory", "Application"],
  ["SSE buffering and API authentication", "Application"],
];

const sections = [
  ["overview", "Overview"],
  ["architecture", "Architecture"],
  ["install", "Install"],
  ["configure", "Configure"],
  ["api", "Public API"],
  ["calls", "Calls & streaming"],
  ["tools", "Tools"],
  ["budgets", "Budgets"],
  ["search", "Search integration"],
  ["responses", "Responses effort"],
  ["boundaries", "Boundaries"],
  ["test", "Raw testing"],
] as const;

function Code({ children, language = "text", title }: { children: string; language?: string; title?: string }) {
  return <CodeBlock code={children} language={language} title={title} />;
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <header className="docs-section-title"><span>{eyebrow}</span><h2>{title}</h2>{children && <p>{children}</p>}</header>;
}

export default function DocsPage() {
  return (
    <main className="docs-page">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-head"><Library size={18} /><span><strong>OreoFlow</strong><small>Framework v1.2.1</small></span></div>
        <nav aria-label="Framework documentation">
          {sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}
        </nav>
        <a className="docs-repo-link" href="https://github.com/elixpo/agent.elixpo/blob/main/docs/oreoflow-framework.md" target="_blank" rel="noreferrer">
          Markdown source <ExternalLink size={13} />
        </a>
      </aside>

      <article className="docs-content">
        <section className="docs-hero" id="overview">
          <div className="docs-kicker"><BookOpen size={15} /> Developer documentation</div>
          <h1>Build agents on the<br /><em>OreoFlow runtime.</em></h1>
          <p>A small, typed Python boundary for model routing, OpenAI-compatible calls, streaming, tool schemas, budgets, and usage accounting.</p>
          <div className="docs-actions">
            <a href="#install">Install v1.2.1 <ArrowRight size={15} /></a>
            <a className="docs-action-secondary" href="https://github.com/elixpo/agent.elixpo" target="_blank" rel="noreferrer">View source <ExternalLink size={14} /></a>
          </div>
          <div className="docs-facts">
            <span><Check size={14} /> Python 3.11+</span><span><Check size={14} /> Async-first</span><span><Check size={14} /> OpenAI-compatible</span><span><Check size={14} /> MIT</span>
          </div>
        </section>

        <section className="docs-section" id="architecture">
          <SectionTitle eyebrow="Mental model" title="A stable runtime boundary">Applications own agent behavior. OreoFlow owns the model-facing mechanics that every agent otherwise repeats.</SectionTitle>
          <div className="docs-flow" aria-label="OreoFlow architecture flow">
            <div><Boxes size={21} /><strong>Application agent</strong><small>prompts · skills · memory</small></div><ArrowRight />
            <div><Library size={21} /><strong>oreoflow</strong><small>stable public API</small></div><ArrowRight />
            <div><Route size={21} /><strong>Router</strong><small>role · budget · ledger</small></div><ArrowRight />
            <div><Radio size={21} /><strong>Provider</strong><small>/chat/completions</small></div>
          </div>
          <div className="docs-note"><ShieldCheck size={18} /><p><strong>Compatibility rule</strong>Consumer applications import from <code>oreoflow</code>, not internal <code>rtk</code> modules. Internal code can evolve without breaking application imports.</p></div>
        </section>

        <section className="docs-section" id="install">
          <SectionTitle eyebrow="01 · Install" title="Pin the released framework">Use the Git tag in production and an editable sibling checkout while developing both repositories.</SectionTitle>
          <div className="docs-two-code">
            <div><h3><GitBranch size={16} /> Released tag</h3><Code language="shell" title="Install from GitHub release">{`python -m pip install \\\n  "git+https://github.com/elixpo/agent.elixpo.git@v1.2.1"`}</Code></div>
            <div><h3><FileCode2 size={16} /> Local development</h3><Code language="shell" title="Editable checkout">{`python -m pip install -e ../agent.elixpo`}</Code></div>
          </div>
          <p className="docs-prose">The distribution name is <code>elixpoo</code>. The supported application import is <code>oreoflow</code>. Search&apos;s Docker build installs the sibling repository through a named BuildKit context.</p>
        </section>

        <section className="docs-section" id="configure">
          <SectionTitle eyebrow="02 · Configure" title="Route capabilities, not model names">Agents request a logical role. A small YAML file decides which provider model serves it.</SectionTitle>
          <div className="docs-split">
            <Code language="yaml" title="models.yaml">{`base_url: https://gen.pollinations.ai/v1
defaults:
  effort: low
roles:
  classify: {model: nova-fast}
  code:     {model: qwen-coder}
  prose:    {model: nova-fast}`}</Code>
            <div className="docs-key-card"><KeyRound size={23} /><h3>Keep the keys separate</h3><dl><div><dt>POLLINATIONS_API_KEY</dt><dd>Application → provider</dd></div><div><dt>API_KEY</dt><dd>User → your public API</dd></div></dl><p>OreoFlow receives provider credentials explicitly. It does not discover or retain an application&apos;s environment file.</p></div>
          </div>
        </section>

        <section className="docs-section" id="api">
          <SectionTitle eyebrow="03 · Reference" title="The v1.2.1 public surface">These names are re-exported from <code>oreoflow</code> and form the current compatibility contract.</SectionTitle>
          <div className="docs-api-grid">{publicApi.map(([name, description]) => <div key={name}><code>{name}</code><p>{description}</p></div>)}</div>
        </section>

        <section className="docs-section" id="calls">
          <SectionTitle eyebrow="04 · Execute" title="One router, calls or chunks">A router keeps one HTTP client per selected model. Reuse it for related work and close it during shutdown.</SectionTitle>
          <Code language="python" title="agent.py">{`import asyncio, os
from dotenv import load_dotenv
from oreoflow import Budget, Message, Router, load_models_config

async def main():
    load_dotenv(".env.local")
    router = Router(
        "task-42",
        models=load_models_config("models.yaml"),
        api_key=os.environ["POLLINATIONS_API_KEY"],
        budget=Budget("task-42", limit=4_000),
    )
    try:
        response = await router.call(
            "code",
            [Message(role="user", content="Write a URL validator")],
            effort="low",
            max_tokens=500,
        )
        print(response.choices[0].message.content)
    finally:
        await router.aclose()

asyncio.run(main())`}</Code>
          <h3 className="docs-subheading"><Zap size={17} /> Stream provider chunks</h3>
          <Code language="python" title="Streaming">{`async for chunk in router.stream("prose", messages, effort="low"):
    for choice in chunk.choices:
        if choice.delta.content:
            print(choice.delta.content, end="", flush=True)`}</Code>
          <p className="docs-prose">The framework yields validated chunks immediately. Your HTTP application decides whether to forward every delta, batch characters, or convert output to SSE events.</p>
        </section>

        <section className="docs-section" id="tools">
          <SectionTitle eyebrow="05 · Tools" title="Declare in OreoFlow, execute in your app">The runtime validates OpenAI function schemas. It intentionally does not authorize or execute application functions.</SectionTitle>
          <Code language="python" title="Function tool">{`tool = ToolDef.model_validate({
  "type": "function",
  "function": {
    "name": "lookup_weather",
    "description": "Read weather for one city.",
    "parameters": {
      "type": "object",
      "properties": {"city": {"type": "string"}},
      "required": ["city"]
    }
  }
})`}</Code>
          <div className="docs-steps"><div><b>1</b><span><strong>Receive</strong><small>Inspect returned tool calls</small></span></div><div><b>2</b><span><strong>Authorize</strong><small>Apply app policy and scopes</small></span></div><div><b>3</b><span><strong>Execute</strong><small>Run the implementation</small></span></div><div><b>4</b><span><strong>Continue</strong><small>Append result and call again</small></span></div></div>
        </section>

        <section className="docs-section" id="budgets">
          <SectionTitle eyebrow="06 · Control" title="Bound every model task">The soft limit is visible to the application; the multiplied hard ceiling is the runaway kill switch.</SectionTitle>
          <div className="docs-control-grid"><div><Gauge /><strong>Soft budget</strong><p><code>remaining()</code> reports capacity. Crossing the soft limit is advisory.</p></div><div><ShieldCheck /><strong>Hard ceiling</strong><p>A pre-call estimate past <code>limit × kill_multiple</code> raises <code>BudgetExceeded</code>.</p></div><div><CircleDollarSign /><strong>Token ledger</strong><p>Completed calls append model, role, cached, prompt, completion, and total usage to JSONL.</p></div></div>
          <Code language="python" title="Budget and ledger">{`budget = Budget("task-42", limit=10_000, kill_multiple=3)
ledger = TokenLedger("state/token_log.jsonl")
router = Router("task-42", models=models, api_key=key,
                budget=budget, ledger=ledger)`}</Code>
        </section>

        <section className="docs-section" id="search">
          <SectionTitle eyebrow="Real integration" title="How Search uses OreoFlow">The deployed Search agent crosses this boundary for every live specialist call and stream.</SectionTitle>
          <div className="docs-runtime-line"><span>/v1/responses</span><ArrowRight /><span>AgentRunner</span><ArrowRight /><span>SkillRegistry</span><ArrowRight /><strong>oreoflow.Router</strong><ArrowRight /><span>Pollinations</span></div>
          <div className="docs-owner-table">{ownership.map(([concern, owner]) => <div key={concern}><span>{concern}</span><strong className={owner === "OreoFlow" ? "owner-framework" : ""}>{owner}</strong></div>)}</div>
          <div className="docs-note"><MessageSquareCode size={18} /><p>Search imports <code>Message</code>, <code>Router</code>, and <code>ToolDef</code> from <code>oreoflow</code>. It owns deterministic agent selection, skill injection, Redis response chains, Qdrant memory, and transport buffering.</p></div>
        </section>

        <section className="docs-section" id="responses">
          <SectionTitle eyebrow="OpenAI compatibility" title="User-selectable response effort">Search maps the Responses API reasoning control directly into OreoFlow for decision and specialist calls.</SectionTitle>
          <Code language="shell" title="Responses API">{`curl https://search.elixpo.com/v1/responses \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{
    "model": "writing",
    "input": "Write a concise release announcement.",
    "reasoning": {"effort": "medium"},
    "stream": true
  }'`}</Code>
          <div className="docs-efforts"><span><b>low</b> Fast default</span><span><b>medium</b> Balanced</span><span><b>high</b> Deliberate</span></div>
        </section>

        <section className="docs-section" id="boundaries">
          <SectionTitle eyebrow="Honest boundary" title="What v1.2.1 does not provide">These remain application responsibilities or roadmap work—not hidden framework features.</SectionTitle>
          <ul className="docs-no-list">
            {[
              "Multi-agent scheduling, rooms, floors, delegation, or A2A transport",
              "A skill registry, policy engine, or tool executor",
              "Redis/Qdrant memory and OpenAI conversation persistence",
              "Image, PDF, browser, or web-search implementations",
              "HTTP endpoints, SSE batching, or public client authentication",
              "A shared router daemon across independent processes",
            ].map((item) => <li key={item}><X size={14} />{item}</li>)}
          </ul>
          <Link className="docs-roadmap" href="https://github.com/elixpo/agent.elixpo/blob/main/docs/ecosystem-framework.md">Read the ecosystem roadmap <ArrowRight size={14} /></Link>
        </section>

        <section className="docs-section" id="test">
          <SectionTitle eyebrow="Verify" title="Raw Python tests">Resolve roles without network access, then opt into one bounded live provider call.</SectionTitle>
          <div className="docs-two-code"><div><h3><TerminalSquare size={16} /> Framework</h3><Code language="shell" title="Framework smoke test">{`cd ~/agent.elixpo
python examples/raw_oreoflow.py --role code

python examples/raw_oreoflow.py \\\n  --role prose --live --stream \\\n  --env-file ../search.elixpo/.env.local \\\n  --prompt "Reply with exactly: ready."`}</Code></div><div><h3><Workflow size={16} /> Search agent</h3><Code language="shell" title="Search integration test">{`cd ~/search.elixpo
python tester/raw_agent_runtime.py \\\n  --agent coding \\\n  --effort medium \\\n  --live --stream \\\n  --prompt "Write a URL validator"`}</Code></div></div>
        </section>

        <footer className="docs-footer"><Braces size={18} /><span><strong>OreoFlow v1.2.1</strong><small>Source contracts over marketing claims.</small></span><a href="https://github.com/elixpo/agent.elixpo" target="_blank" rel="noreferrer">GitHub <ExternalLink size={13} /></a></footer>
      </article>
    </main>
  );
}
