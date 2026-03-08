"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import ShapeSidebar from './ShapeSidebar'
import { useState } from 'react'

const STROKE_COLORS = [
  { color: '#fff', label: 'White' },
  { color: '#FF8383', label: 'Red' },
  { color: '#3A994C', label: 'Green' },
  { color: '#56A2E8', label: 'Blue' },
  { color: '#FFD700', label: 'Gold' },
]

const BG_COLORS = [
  { color: '#f0f0f0', label: 'Light Gray' },
  { color: '#ffcccb', label: 'Light Red' },
  { color: '#90ee90', label: 'Light Green' },
  { color: '#add8e6', label: 'Light Blue' },
  { color: 'transparent', label: 'None' },
]

const THICKNESSES = [
  { value: 2, label: 'Thin' },
  { value: 5, label: 'Medium' },
  { value: 7, label: 'Thick' },
]

const STYLES = [
  {
    value: 'solid',
    label: 'Solid',
    svg: '<svg width="28" height="2" viewBox="0 0 28 2"><line x1="0" y1="1" x2="28" y2="1" stroke="currentColor" stroke-width="2"/></svg>',
  },
  {
    value: 'dashed',
    label: 'Dashed',
    svg: '<svg width="28" height="2" viewBox="0 0 28 2"><line x1="0" y1="1" x2="28" y2="1" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/></svg>',
  },
  {
    value: 'dotted',
    label: 'Dotted',
    svg: '<svg width="28" height="2" viewBox="0 0 28 2"><line x1="0" y1="1" x2="28" y2="1" stroke="currentColor" stroke-width="2" stroke-dasharray="1 3" stroke-linecap="round"/></svg>',
  },
]

const FILLS = [
  {
    value: 'hachure',
    label: 'Hachure',
    svg: '<svg width="20" height="20" viewBox="0 0 20 20"><line x1="0" y1="4" x2="4" y2="0" stroke="currentColor" stroke-width="1.5"/><line x1="0" y1="10" x2="10" y2="0" stroke="currentColor" stroke-width="1.5"/><line x1="0" y1="16" x2="16" y2="0" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="20" x2="20" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="20" x2="20" y2="16" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
  {
    value: 'solid',
    label: 'Solid',
    svg: '<svg width="20" height="20" viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" fill="currentColor" rx="2"/></svg>',
  },
  {
    value: 'dots',
    label: 'Dots',
    svg: '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="4" cy="4" r="1.5" fill="currentColor"/><circle cx="10" cy="4" r="1.5" fill="currentColor"/><circle cx="16" cy="4" r="1.5" fill="currentColor"/><circle cx="4" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="16" cy="10" r="1.5" fill="currentColor"/><circle cx="4" cy="16" r="1.5" fill="currentColor"/><circle cx="10" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>',
  },
  {
    value: 'cross-hatch',
    label: 'Cross Hatch',
    svg: '<svg width="20" height="20" viewBox="0 0 20 20"><line x1="0" y1="4" x2="4" y2="0" stroke="currentColor" stroke-width="1"/><line x1="0" y1="10" x2="10" y2="0" stroke="currentColor" stroke-width="1"/><line x1="0" y1="16" x2="16" y2="0" stroke="currentColor" stroke-width="1"/><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="1"/><line x1="16" y1="0" x2="0" y2="16" stroke="currentColor" stroke-width="1"/><line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" stroke-width="1"/><line x1="20" y1="10" x2="10" y2="20" stroke="currentColor" stroke-width="1"/></svg>',
  },
  {
    value: 'transparent',
    label: 'None',
    svg: '<svg width="20" height="20" viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" rx="2" stroke-dasharray="3 2"/></svg>',
  },
]

function ColorSwatches({ colors, selected, onSelect, label }) {
  return (
    <div className="mb-3">
      <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {colors.map((c) => (
          <button
            key={c.color}
            title={c.label}
            onClick={() => onSelect(c.color)}
            className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
              selected === c.color
                ? 'border-accent scale-110'
                : 'border-border hover:border-border-light'
            } ${c.color === 'transparent' ? 'bg-surface-dark' : ''}`}
            style={c.color !== 'transparent' ? { backgroundColor: c.color } : undefined}
          >
            {c.color === 'transparent' && (
              <svg className="w-full h-full text-text-dim" viewBox="0 0 20 20">
                <line x1="3" y1="17" x2="17" y2="3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function SvgIcon({ svg }) {
  return <span dangerouslySetInnerHTML={{ __html: svg }} />
}

export default function RectangleSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [strokeColor, setStrokeColor] = useState('#fff')
  const [bgColor, setBgColor] = useState('transparent')
  const [thickness, setThickness] = useState(2)
  const [lineStyle, setLineStyle] = useState('solid')
  const [fillStyle, setFillStyle] = useState('hachure')

  return (
    <ShapeSidebar visible={activeTool === TOOLS.RECTANGLE} title="Rectangle">
      <ColorSwatches
        colors={STROKE_COLORS}
        selected={strokeColor}
        onSelect={setStrokeColor}
        label="Stroke"
      />
      <ColorSwatches
        colors={BG_COLORS}
        selected={bgColor}
        onSelect={setBgColor}
        label="Background"
      />

      {/* Thickness */}
      <div className="mb-3">
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Thickness</p>
        <div className="flex items-center gap-1">
          {THICKNESSES.map((t) => (
            <button
              key={t.value}
              onClick={() => setThickness(t.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] transition-all duration-200 ${
                thickness === t.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div className="mb-3">
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Style</p>
        <div className="flex items-center gap-1">
          {STYLES.map((s) => (
            <button
              key={s.value}
              title={s.label}
              onClick={() => setLineStyle(s.value)}
              className={`flex-1 py-2 flex items-center justify-center rounded-lg transition-all duration-200 ${
                lineStyle === s.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <SvgIcon svg={s.svg} />
            </button>
          ))}
        </div>
      </div>

      {/* Fill */}
      <div>
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Fill</p>
        <div className="flex items-center gap-1">
          {FILLS.map((f) => (
            <button
              key={f.value}
              title={f.label}
              onClick={() => setFillStyle(f.value)}
              className={`flex-1 py-1.5 flex items-center justify-center rounded-lg transition-all duration-200 ${
                fillStyle === f.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <SvgIcon svg={f.svg} />
            </button>
          ))}
        </div>
      </div>
    </ShapeSidebar>
  )
}
