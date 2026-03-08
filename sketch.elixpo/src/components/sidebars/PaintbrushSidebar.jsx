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

const TAPERS = [
  { value: 'uniform', label: 'Uniform' },
  { value: 'pen', label: 'Pen' },
  { value: 'brush', label: 'Brush' },
]

const ROUGHNESS_OPTIONS = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'medium', label: 'Medium' },
  { value: 'rough', label: 'Rough' },
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
            }`}
            style={{ backgroundColor: c.color }}
          />
        ))}
      </div>
    </div>
  )
}

function SvgIcon({ svg }) {
  return <span dangerouslySetInnerHTML={{ __html: svg }} />
}

export default function PaintbrushSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [strokeColor, setStrokeColor] = useState('#fff')
  const [thickness, setThickness] = useState(2)
  const [lineStyle, setLineStyle] = useState('solid')
  const [taper, setTaper] = useState('uniform')
  const [roughness, setRoughness] = useState('smooth')
  const [opacity, setOpacity] = useState(1)

  return (
    <ShapeSidebar visible={activeTool === TOOLS.FREEHAND} title="Paintbrush">
      <ColorSwatches
        colors={STROKE_COLORS}
        selected={strokeColor}
        onSelect={setStrokeColor}
        label="Stroke"
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

      {/* Taper */}
      <div className="mb-3">
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Taper</p>
        <div className="flex items-center gap-1">
          {TAPERS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTaper(t.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] transition-all duration-200 ${
                taper === t.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roughness */}
      <div className="mb-3">
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Roughness</p>
        <div className="flex items-center gap-1">
          {ROUGHNESS_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRoughness(r.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] transition-all duration-200 ${
                roughness === r.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div>
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">
          Opacity ({Math.round(opacity * 100)}%)
        </p>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-surface-dark rounded-lg appearance-none cursor-pointer accent-accent-blue"
        />
      </div>
    </ShapeSidebar>
  )
}
