'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';

export const TabsBlock = createReactBlockSpec(
  {
    type: 'tabsBlock',
    propSchema: {
      tabs: { default: '[]' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      let tabs = [];
      try { tabs = JSON.parse(block.props.tabs); } catch {}

      const [activeTab, setActiveTab] = useState(0);
      const [editing, setEditing] = useState(tabs.length === 0);
      const [text, setText] = useState(tabs.map((t) => `${t.title}\n${t.content}`).join('\n---\n'));

      const save = () => {
        const parsed = text.split('\n---\n').filter(Boolean).map((section) => {
          const lines = section.split('\n');
          const title = lines[0]?.trim() || 'Tab';
          const content = lines.slice(1).join('\n').trim();
          return { title, content };
        });
        if (parsed.length === 0) parsed.push({ title: 'Tab 1', content: '' });
        editor.updateBlock(block, { props: { tabs: JSON.stringify(parsed) } });
        setEditing(false);
      };

      if (editing) {
        return (
          <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] p-4 my-2">
            <p className="text-[11px] text-[var(--text-muted)] font-medium mb-1">Tabs Block</p>
            <p className="text-[10px] text-[var(--text-muted)] mb-2">Separate tabs with --- on its own line. First line of each tab is the title.</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Getting Started\nContent for first tab\n---\nAdvanced\nContent for second tab"}
              rows={8}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg p-3 text-[13px] text-[var(--text-primary)] font-mono resize-none outline-none focus:border-[var(--border-hover)] placeholder-[#6b7a8d]"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditing(false)} className="px-3 py-1 text-[12px] text-[#888]">Cancel</button>
              <button onClick={save} className="px-3 py-1 text-[12px] bg-[#9b7bf7] text-[var(--text-primary)] rounded-md font-medium hover:bg-[#b69aff] transition-colors">Done</button>
            </div>
          </div>
        );
      }

      return (
        <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] my-2 overflow-hidden" onDoubleClick={() => setEditing(true)}>
          <div className="flex border-b border-[var(--border-default)]">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  i === activeTab ? 'text-[var(--text-primary)] border-white' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-body)]'
                }`}
              >
                {tab.title}
              </button>
            ))}
          </div>
          <div className="p-4 text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap min-h-[60px]">
            {tabs[activeTab]?.content || ''}
          </div>
        </div>
      );
    },
  }
);
