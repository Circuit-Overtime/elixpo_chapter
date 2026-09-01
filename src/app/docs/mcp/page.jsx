import Link from 'next/link'

const CLIENT_CONFIG = `{
  "mcpServers": {
    "lixsketch": {
      "command": "npx",
      "args": [
        "-y",
        "@elixpo/lixsketch",
        "--scene",
        "/absolute/path/to/architecture.lixjson"
      ]
    }
  }
}`

const PATCH_EXAMPLE = `{
  "expectedRevision": 0,
  "dryRun": true,
  "operations": [
    {
      "op": "add",
      "shape": {
        "type": "rectangle",
        "shapeID": "api-service",
        "x": 120,
        "y": 80,
        "width": 220,
        "height": 100,
        "options": {
          "stroke": "#a78bfa",
          "fill": "#2f2442"
        }
      }
    }
  ]
}`

const NODE_EXAMPLE = `import {
  createLixSketchMcpServer,
  MemorySceneStore,
  createEmptyScene,
} from '@elixpo/lixsketch/mcp'

const server = createLixSketchMcpServer({
  store: new MemorySceneStore(createEmptyScene('Architecture')),
})`

const TOOLS = [
  ['canvas_get', 'Read the canvas summary, current revision, and optionally selected or all shapes.'],
  ['canvas_apply_patch', 'Atomically add, update, translate, delete, or rename scene content.'],
  ['canvas_validate', 'Check scene format, geometry, unique IDs, and package limits.'],
  ['canvas_preview', 'Render a lightweight SVG preview before or after a change.'],
  ['canvas_new', 'Replace the scene with a blank canvas after explicit confirmation.'],
  ['templates_search', 'Search public workspace and component templates.'],
  ['template_insert', 'Insert a published template with remapped shape and relationship IDs.'],
]

function CodeBlock({ children }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#171120] p-4 text-xs leading-6 text-[#d8c9f5] sm:text-sm">
      <code className="font-[lixCode]">{children}</code>
    </pre>
  )
}

function DocSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-white/[0.08] bg-surface-card p-5 sm:p-7">
      <h2 className="text-xl text-text-primary">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-text-muted">{children}</div>
    </section>
  )
}

export default function McpDocsPage() {
  return (
    <div className="min-h-screen bg-surface-dark font-[lixFont] text-text-primary">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-surface-dark/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/?noredirect=1" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <img src="/icon.png" alt="LixSketch" className="h-7 w-7 rounded-md" />
              <span>LixSketch</span>
            </Link>
            <span className="text-text-dim">/</span>
            <Link href="/docs" className="text-text-muted hover:text-text-primary">Docs</Link>
            <span className="text-text-dim">/</span>
            <span className="text-text-secondary">MCP Server</span>
          </div>
          <Link href="/resources/npm-package" className="rounded-lg bg-accent px-3.5 py-2 text-xs text-white transition hover:bg-accent/85">
            Package docs
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[210px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1 rounded-xl border border-white/[0.06] bg-surface-card p-3 text-sm">
            {[
              ['overview', 'Overview'],
              ['setup', 'Client setup'],
              ['tools', 'Tools'],
              ['workflow', 'Safe workflow'],
              ['templates', 'Templates'],
              ['embedding', 'Package API'],
              ['limits', 'Limits'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-2 text-text-muted hover:bg-surface-hover hover:text-text-primary">{label}</a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-7">
          <section id="overview" className="scroll-mt-24 pb-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-accent">
              <i className="bx bx-plug text-base" />
              LixSketch Docs
            </div>
            <h1 className="mt-3 text-3xl text-text-primary sm:text-4xl">MCP server</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted sm:text-base">
              The LixSketch package includes a local MCP server that lets compatible tools inspect and edit structured canvas scenes, validate changes, render previews, and reuse published templates.
            </p>
            <div className="mt-5 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm leading-6 text-text-muted">
              MCP edits an atomic local scene file. LixScript remains a separate, coming-soon interface and is not required to use the MCP server.
            </div>
          </section>

          <DocSection id="setup" title="Client setup">
            <p className="mb-4">Add the server to a client that supports local stdio MCP servers. Use an absolute scene path so the same canvas is opened on every launch.</p>
            <CodeBlock>{CLIENT_CONFIG}</CodeBlock>
            <p className="mt-4">The equivalent terminal command is <code className="font-[lixCode] text-accent">npx @elixpo/lixsketch --scene ./architecture.lixjson</code>. JSON-RPC uses stdout; status messages use stderr.</p>
          </DocSection>

          <DocSection id="tools" title="Available tools">
            <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
              <table className="w-full min-w-[620px] text-left">
                <thead className="border-b border-white/[0.07] bg-black/10 text-xs text-text-dim">
                  <tr><th className="px-4 py-3 font-normal">Tool</th><th className="px-4 py-3 font-normal">Purpose</th></tr>
                </thead>
                <tbody>
                  {TOOLS.map(([name, purpose]) => (
                    <tr key={name} className="border-b border-white/[0.055] last:border-0">
                      <td className="px-4 py-3 font-[lixCode] text-xs text-accent">{name}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocSection>

          <DocSection id="workflow" title="Safe editing workflow">
            <ol className="mb-5 list-decimal space-y-2 pl-5">
              <li>Call <code className="font-[lixCode] text-accent">canvas_get</code> and retain its revision.</li>
              <li>Submit a patch with that <code className="font-[lixCode] text-accent">expectedRevision</code> and <code className="font-[lixCode] text-accent">dryRun: true</code>.</li>
              <li>Inspect <code className="font-[lixCode] text-accent">canvas_preview</code> when geometry or layout changed.</li>
              <li>Repeat the same patch with <code className="font-[lixCode] text-accent">dryRun: false</code> to save it.</li>
            </ol>
            <CodeBlock>{PATCH_EXAMPLE}</CodeBlock>
            <p className="mt-4">A patch is stored in full or not at all. A stale revision returns a conflict instead of overwriting a newer edit.</p>
          </DocSection>

          <DocSection id="templates" title="Published templates">
            <p>Use <code className="font-[lixCode] text-accent">templates_search</code> to find public workspace or component templates, including reusable symbol packs. Then call <code className="font-[lixCode] text-accent">template_insert</code> with its slug and target coordinates.</p>
            <p className="mt-3">Insertion remaps shape, frame, group, and attachment identifiers before adding the template to the current scene, so repeated imports do not collide.</p>
            <Link href="/templates" className="mt-4 inline-flex items-center gap-2 text-accent hover:underline">Browse the marketplace <i className="bx bx-right-arrow-alt" /></Link>
          </DocSection>

          <DocSection id="embedding" title="Package API">
            <p className="mb-4">Custom hosts can use the runtime-neutral server factory with a memory store or an asynchronous store implementing <code className="font-[lixCode] text-accent">read()</code> and <code className="font-[lixCode] text-accent">write(scene)</code>.</p>
            <CodeBlock>{NODE_EXAMPLE}</CodeBlock>
            <p className="mt-4">Node-only hosts can import <code className="font-[lixCode] text-accent">FileSceneStore</code> and <code className="font-[lixCode] text-accent">serveLixSketchStdio</code> from <code className="font-[lixCode] text-accent">@elixpo/lixsketch/mcp/node</code>.</p>
          </DocSection>

          <DocSection id="limits" title="Supported content and limits">
            <ul className="space-y-2">
              <li>Writable types: rectangle, circle, line, arrow, frame, freehand stroke, and text.</li>
              <li>Images, icons, and code shapes can be preserved and read, but direct arbitrary markup writes are blocked.</li>
              <li>Maximum 5,000 shapes per scene and 500 operations per patch.</li>
              <li>Local scene files are capped at 20 MB, requests at 10 MB, and SVG previews at 5 MB.</li>
              <li><code className="font-[lixCode] text-accent">canvas_new</code> requires explicit confirmation because it replaces the current scene.</li>
            </ul>
          </DocSection>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] py-5 text-sm">
            <Link href="/docs" className="text-text-muted hover:text-text-primary"><i className="bx bx-left-arrow-alt mr-1" />Back to Docs</Link>
            <Link href="/templates" className="text-accent hover:underline">Explore templates</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
