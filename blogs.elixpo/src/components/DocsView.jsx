'use client';

import { useState } from 'react';
import AppShell from './AppShell';

function LinkCard({ icon, iconColor, bg, title, desc, href, cta }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block rounded-2xl p-5 h-full transition-colors" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
          <ion-icon name={icon} style={{ fontSize: '20px', color: iconColor }} />
        </div>
        <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      <span className="text-[13px] underline" style={{ color: 'var(--accent)' }}>{cta} →</span>
    </a>
  );
}

export default function DocsView({ md, html }) {
  const [copied, setCopied] = useState(false);
  const copyForLLM = () => {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };

  return (
    <AppShell>
      <div className="w-full max-w-3xl mx-auto px-6 py-12 block">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>LixEditor Docs</h1>
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Developer API for the editor that powers LixBlogs.</p>
          </div>
          <button
            onClick={copyForLLM}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ color: copied ? '#16a34a' : 'var(--text-muted)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}
            title="Copy these docs as Markdown for an LLM"
          >
            <ion-icon name={copied ? 'checkmark' : 'copy-outline'} style={{ fontSize: '15px' }} />
            {copied ? 'Copied' : 'Copy for LLM'}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-10">
          <LinkCard icon="logo-npm" iconColor="#cb0004" bg="#cb000420" title="npm package" desc="Install @elixpo/lixeditor and use the editor in any React app." href="https://www.npmjs.com/package/@elixpo/lixeditor" cta="View on npm" />
          <LinkCard icon="code-slash-outline" iconColor="#0098ff" bg="#0098ff20" title="VS Code extension" desc="Draft and preview posts without leaving your editor." href="https://marketplace.visualstudio.com/items?itemName=Elixpo.lixeditor" cta="Get it on the Marketplace" />
        </div>

        <div className="legal-md" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </AppShell>
  );
}
