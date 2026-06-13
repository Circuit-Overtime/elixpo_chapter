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

export default function DocsPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-12" style={{ color: 'var(--text-secondary)' }}>
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>Docs</h1>
        <p className="text-[15px] mb-10" style={{ color: 'var(--text-muted)' }}>
          LixEditor is the block-based WYSIWYG editor that powers LixBlogs. Use it in your own React app, or write inside VS Code.
        </p>

        <section className="mb-10">
          <h2 className="text-[18px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>LixEditor — npm package</h2>
          <p className="text-[14px] leading-relaxed mb-2">Install the editor package from npm:</p>
          <Code>npm install @elixpo/lixeditor</Code>
          <p className="text-[14px] leading-relaxed mt-3 mb-1">Then mount it in a React component:</p>
          <Code>{`import { LixEditor } from '@elixpo/lixeditor';
import '@elixpo/lixeditor/style.css';

export default function Editor() {
  return <LixEditor onChange={(blocks) => console.log(blocks)} />;
}`}</Code>
          <p className="text-[13px] mt-3" style={{ color: 'var(--text-faint)' }}>
            View on <a href="https://www.npmjs.com/package/@elixpo/lixeditor" target="_blank" rel="noopener noreferrer" className="underline">npm</a>.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-[18px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>VS Code extension</h2>
          <p className="text-[14px] leading-relaxed mb-2">
            Prefer your editor? Install <strong style={{ color: 'var(--text-primary)' }}>LixEditor</strong> from the VS Code Marketplace to draft and preview blog posts without leaving your workspace.
          </p>
          <Code>ext install elixpo.lixeditor</Code>
          <p className="text-[13px] mt-3" style={{ color: 'var(--text-faint)' }}>
            Or search “LixEditor” in the Extensions panel (<kbd>Ctrl/Cmd+Shift+X</kbd>).
          </p>
        </section>

        <section className="mb-4">
          <h2 className="text-[18px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Features</h2>
          <ul className="text-[14px] leading-relaxed list-disc pl-5 space-y-1">
            <li>Notion-style blocks: headings, lists, quotes, code, tables, images, equations, and tabs.</li>
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
