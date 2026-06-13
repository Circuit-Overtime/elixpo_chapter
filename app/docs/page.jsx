import AppShell from '../../src/components/AppShell';

export const metadata = {
  title: 'Docs — LixBlogs',
  description: 'Documentation for the LixEditor package, npm install, and the VS Code extension.',
};

function Code({ children }) {
  return (
    <pre className="rounded-lg px-4 py-3 text-[13px] overflow-x-auto my-2" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
      <code>{children}</code>
    </pre>
  );
}

function NpmCard() {
  return (
    <div className="rounded-2xl p-5 h-full" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#cb000420' }}>
          <ion-icon name="logo-npm" style={{ fontSize: '22px', color: '#cb0004' }} />
        </div>
        <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>npm package</h2>
      </div>
      <p className="text-[14px] leading-relaxed mb-1" style={{ color: 'var(--text-muted)' }}>Use the editor in any React app:</p>
      <Code>npm install @elixpo/lixeditor</Code>
      <Code>{`import { LixEditor } from '@elixpo/lixeditor';
import '@elixpo/lixeditor/style.css';

<LixEditor onChange={(blocks) => save(blocks)} />`}</Code>
      <a href="https://www.npmjs.com/package/@elixpo/lixeditor" target="_blank" rel="noopener noreferrer" className="text-[13px] underline" style={{ color: 'var(--accent)' }}>View on npm →</a>
    </div>
  );
}

function VSCodeCard() {
  return (
    <div className="rounded-2xl p-5 h-full" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0098ff20' }}>
          <ion-icon name="code-slash-outline" style={{ fontSize: '20px', color: '#0098ff' }} />
        </div>
        <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>VS Code extension</h2>
      </div>
      <p className="text-[14px] leading-relaxed mb-1" style={{ color: 'var(--text-muted)' }}>Draft &amp; preview posts without leaving your editor:</p>
      <Code>ext install elixpo.lixeditor</Code>
      <p className="text-[13px] mt-1" style={{ color: 'var(--text-faint)' }}>Or search “LixEditor” in the Extensions panel (Ctrl/Cmd+Shift+X).</p>
    </div>
  );
}

export default function DocsPage() {
  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto px-6 py-12 block">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>Docs</h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--text-muted)' }}>
          LixEditor is the block-based WYSIWYG editor that powers LixBlogs. Use it in your own React app, or write inside VS Code.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-10">
          <NpmCard />
          <VSCodeCard />
        </div>

        <section>
          <h2 className="text-[18px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Features</h2>
          <ul className="text-[14px] leading-relaxed list-disc pl-5 space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>Notion-style blocks: headings, lists, quotes, code, tables, images, equations, tabs.</li>
            <li>Markdown shortcuts and slash (<code>/</code>) commands.</li>
            <li>Real-time collaboration ready (Yjs).</li>
            <li>Exports clean block JSON you can store and re-render anywhere.</li>
          </ul>
        </section>

        <p className="text-[13px] mt-8" style={{ color: 'var(--text-faint)' }}>
          Questions? See <a href="/help" className="underline">Help</a> or email hello@elixpo.com.
        </p>
      </div>
    </AppShell>
  );
}
