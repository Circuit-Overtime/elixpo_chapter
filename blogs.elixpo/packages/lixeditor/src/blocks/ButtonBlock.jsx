'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';

const BUTTON_ACTIONS = [
  { value: 'link', label: 'Open Link' },
  { value: 'copy', label: 'Copy Text' },
  { value: 'scroll-top', label: 'Scroll to Top' },
  { value: 'share', label: 'Share Page' },
];

const BUTTON_VARIANTS = [
  { value: 'solid', label: 'Solid' },
  { value: 'outline', label: 'Outline' },
];

const ALIGN = ['left', 'center', 'right'];

// 2.7.0 contract: { text, url, align, variant: solid|outline, color, radius }.
// Legacy fields (label, action, actionValue + variant primary/secondary/accent)
// are kept in the schema for backward compatibility and read as fallbacks.
export const ButtonBlock = createReactBlockSpec(
  {
    type: 'buttonBlock',
    propSchema: {
      // email contract
      text: { default: '' },
      url: { default: '' },
      align: { default: 'left' },
      variant: { default: 'solid' },
      color: { default: '#7c5cff' },
      radius: { default: 8 },
      // legacy / interactive (kept for back-compat)
      label: { default: '' },
      action: { default: 'link' },
      actionValue: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const p = block.props;
      const initialText = p.text || p.label || '';
      const initialUrl = p.url || (p.action === 'link' ? p.actionValue : '') || '';
      // Normalize a legacy variant (primary/accent → solid, secondary → outline).
      const initialVariant = p.variant === 'outline' || p.variant === 'secondary' ? 'outline' : 'solid';

      const [editing, setEditing] = useState(!initialText);
      const [text, setText] = useState(initialText);
      const [url, setUrl] = useState(initialUrl);
      const [align, setAlign] = useState(p.align || 'left');
      const [variant, setVariant] = useState(initialVariant);
      const [color, setColor] = useState(p.color || '#7c5cff');
      const [radius, setRadius] = useState(p.radius ?? 8);

      const save = () => {
        editor.updateBlock(block, {
          props: {
            text, url, align, variant, color, radius: Number(radius) || 0,
            // mirror into legacy fields so older renderers still work
            label: text, action: 'link', actionValue: url,
          },
        });
        setEditing(false);
      };

      const input = 'w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--border-hover)] placeholder-[#6b7a8d]';

      if (editing) {
        return (
          <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] p-4 my-2 space-y-3">
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Button</p>
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Button text — e.g. Get started" className={input} />
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…  (supports {{variables}})" className={input} />
            <div className="flex gap-2 flex-wrap">
              <select value={align} onChange={(e) => setAlign(e.target.value)} className="bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none">
                {ALIGN.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={variant} onChange={(e) => setVariant(e.target.value)} className="bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none">
                {BUTTON_VARIANTS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Color" className="w-9 h-9 rounded-lg border border-[var(--border-default)] bg-transparent cursor-pointer" />
              <input type="number" min="0" max="40" value={radius} onChange={(e) => setRadius(e.target.value)} title="Corner radius (px)" className="w-16 bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="px-3 py-1 text-[12px] text-[#888] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
              <button onClick={save} className="px-3 py-1 text-[12px] bg-[#9b7bf7] text-white rounded-md font-medium hover:bg-[#b69aff] transition-colors">Done</button>
            </div>
          </div>
        );
      }

      const solid = variant !== 'outline';
      const btnStyle = solid
        ? { background: color, color: '#fff', border: `2px solid ${color}` }
        : { background: 'transparent', color, border: `2px solid ${color}` };

      return (
        <div className="my-2" style={{ textAlign: align }} onDoubleClick={() => setEditing(true)}>
          <button
            className="px-5 py-2.5 text-[14px] font-semibold transition-opacity hover:opacity-90"
            style={{ ...btnStyle, borderRadius: `${Number(radius) || 0}px`, cursor: 'pointer' }}
          >
            {text || 'Button'}
          </button>
        </div>
      );
    },
  }
);
