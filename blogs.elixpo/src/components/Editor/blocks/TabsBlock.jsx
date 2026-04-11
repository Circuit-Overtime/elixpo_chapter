'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState, useRef, useEffect } from 'react';

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

      const [adding, setAdding] = useState(tabs.length === 0);
      const [newPageName, setNewPageName] = useState('');
      const [expandedTab, setExpandedTab] = useState(null);
      const [editingIdx, setEditingIdx] = useState(null);
      const [editContent, setEditContent] = useState('');
      const inputRef = useRef(null);

      useEffect(() => {
        if (adding && inputRef.current) inputRef.current.focus();
      }, [adding]);

      const addPage = () => {
        const name = newPageName.trim() || 'Untitled Page';
        const updated = [...tabs, { title: name, content: '' }];
        editor.updateBlock(block, { props: { tabs: JSON.stringify(updated) } });
        setNewPageName('');
        setAdding(false);
      };

      const removePage = (idx) => {
        const updated = tabs.filter((_, i) => i !== idx);
        editor.updateBlock(block, { props: { tabs: JSON.stringify(updated) } });
        if (expandedTab === idx) setExpandedTab(null);
      };

      const saveContent = (idx) => {
        const updated = tabs.map((t, i) => i === idx ? { ...t, content: editContent } : t);
        editor.updateBlock(block, { props: { tabs: JSON.stringify(updated) } });
        setEditingIdx(null);
      };

      const renamePage = (idx, newName) => {
        const updated = tabs.map((t, i) => i === idx ? { ...t, title: newName } : t);
        editor.updateBlock(block, { props: { tabs: JSON.stringify(updated) } });
      };

      return (
        <div className="my-2" contentEditable={false}>
          {/* Page list */}
          {tabs.map((tab, i) => (
            <div key={i}>
              <div
                className="w-full flex items-center gap-3 px-4 py-3 transition-all group/page cursor-pointer"
                style={{
                  backgroundColor: expandedTab === i ? 'var(--bg-surface)' : 'transparent',
                  borderLeft: expandedTab === i ? '3px solid #9b7bf7' : '3px solid transparent',
                  borderBottom: '1px solid var(--divider)',
                }}
                onMouseEnter={e => { if (expandedTab !== i) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (expandedTab !== i) e.currentTarget.style.backgroundColor = expandedTab === i ? 'var(--bg-surface)' : 'transparent'; }}
                onClick={() => setExpandedTab(expandedTab === i ? null : i)}
              >
                {/* Page icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ backgroundColor: expandedTab === i ? 'rgba(155,123,247,0.12)' : 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={expandedTab === i ? '#9b7bf7' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-faint)' }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>

                {/* Title — editable on double-click */}
                <span
                  className="flex-1 text-[14px] font-semibold truncate"
                  style={{ color: 'var(--text-primary)' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const name = prompt('Rename page:', tab.title);
                    if (name?.trim()) renamePage(i, name.trim());
                  }}
                >
                  {tab.title}
                </span>

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); removePage(i); }}
                  className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover/page:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-faint)' }}
                  title="Remove page"
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>

                {/* Arrow */}
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{ color: 'var(--text-faint)', transform: expandedTab === i ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              {/* Expanded content */}
              {expandedTab === i && (
                <div
                  className="px-5 py-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '3px solid #9b7bf7', borderBottom: '1px solid var(--divider)' }}
                >
                  {editingIdx === i ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg p-3 text-[13px] resize-none outline-none"
                        style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingIdx(null)} className="px-3 py-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                        <button onClick={() => saveContent(i)} className="px-3 py-1 text-[12px] bg-[#9b7bf7] text-white rounded-lg font-medium">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {tab.content ? (
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{tab.content}</p>
                      ) : (
                        <p className="text-[13px] italic" style={{ color: 'var(--text-faint)' }}>Empty page — click edit to add content</p>
                      )}
                      <button
                        onClick={() => { setEditingIdx(i); setEditContent(tab.content || ''); }}
                        className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                        style={{ color: 'var(--text-faint)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit content
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add new page */}
          {adding ? (
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(155,123,247,0.08)', border: '1px dashed rgba(155,123,247,0.3)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b7bf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <input
                ref={inputRef}
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPageName.trim()) { e.preventDefault(); addPage(); }
                  if (e.key === 'Escape') setAdding(false);
                }}
                placeholder="Page name..."
                className="flex-1 text-[14px] bg-transparent outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <button
                onClick={addPage}
                disabled={!newPageName.trim()}
                className="px-3 py-1.5 text-[12px] font-medium text-white rounded-lg transition-colors disabled:opacity-30"
                style={{ backgroundColor: '#9b7bf7' }}
              >
                Insert Page
              </button>
              <button onClick={() => { setAdding(false); setNewPageName(''); }} className="px-2 py-1.5 text-[12px]" style={{ color: 'var(--text-faint)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-2.5 w-full text-left transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = '#9b7bf7'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span className="text-[12px] font-medium">Add sub-page</span>
            </button>
          )}
        </div>
      );
    },
  }
);
