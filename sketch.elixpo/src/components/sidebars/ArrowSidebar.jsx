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

const OUTLINE_STYLES = [
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

const HEAD_STYLES = [
  {
    value: 'default',
    label: 'Default',
    svg: '<svg width="24" height="16" viewBox="0 0 24 16"><line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="2"/><polyline points="14,3 20,8 14,13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  },
  {
    value: 'square',
    label: 'Square',
    svg: '<svg width="24" height="16" viewBox="0 0 24 16"><line x1="2" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="2"/><rect x="15" y="4" width="6" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
  {
    value: 'outline',
    label: 'Outline',
    svg: '<svg width="24" height="16" viewBox="0 0 24 16"><line x1="2" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/><polygon points="14,3 22,8 14,13" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
  {
    value: 'solid',
    label: 'Solid',
    svg: '<svg width="24" height="16" viewBox="0 0 24 16"><line x1="2" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="2"/><polygon points="14,3 22,8 14,13" fill="currentColor" stroke="currentColor" stroke-width="1"/></svg>',
  },
]

const ARROW_TYPES = [
  { value: 'straight', label: 'Straight' },
  { value: 'curved', label: 'Curved' },
  { value: 'elbow', label: 'Elbow' },
]

const CURVATURES = [
  { value: 8, label: 'Low' },
  { value: 20, label: 'Mid' },
  { value: 40, label: 'High' },
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

export default function ArrowSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [headStyle, setHeadStyle] = useState('default')
  const [strokeColor, setStrokeColor] = useState('#fff')
  const [thickness, setThickness] = useState(2)
  const [outlineStyle, setOutlineStyle] = useState('solid')
  const [arrowType, setArrowType] = useState('straight')
  const [curvature, setCurvature] = useState(8)

  return (
    <ShapeSidebar visible={activeTool === TOOLS.ARROW} title="Arrow">
      {/* Head Style */}
      <div className="mb-3">
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Head</p>
        <div className="flex items-center gap-1">
          {HEAD_STYLES.map((h) => (
            <button
              key={h.value}
              title={h.label}
              onClick={() => setHeadStyle(h.value)}
              className={`flex-1 py-1.5 flex items-center justify-center rounded-lg transition-all duration-200 ${
                headStyle === h.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <SvgIcon svg={h.svg} />
            </button>
          ))}
        </div>
      </div>

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

      {/* Outline Style */}
      <div className="mb-3">
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Outline</p>
        <div className="flex items-center gap-1">
          {OUTLINE_STYLES.map((s) => (
            <button
              key={s.value}
              title={s.label}
              onClick={() => setOutlineStyle(s.value)}
              className={`flex-1 py-2 flex items-center justify-center rounded-lg transition-all duration-200 ${
                outlineStyle === s.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <SvgIcon svg={s.svg} />
            </button>
          ))}
        </div>
      </div>

      {/* Arrow Type */}
      <div className="mb-3">
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Type</p>
        <div className="flex items-center gap-1">
          {ARROW_TYPES.map((a) => (
            <button
              key={a.value}
              onClick={() => setArrowType(a.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] transition-all duration-200 ${
                arrowType === a.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Curvature */}
      {arrowType === 'curved' && (
        <div>
          <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Curvature</p>
          <div className="flex items-center gap-1">
            {CURVATURES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCurvature(c.value)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] transition-all duration-200 ${
                  curvature === c.value
                    ? 'bg-surface-active text-text-primary'
                    : 'text-text-muted hover:bg-surface-hover'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </ShapeSidebar>
  )
}
