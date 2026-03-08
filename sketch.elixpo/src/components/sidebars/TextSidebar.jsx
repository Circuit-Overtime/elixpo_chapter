"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import ShapeSidebar from './ShapeSidebar'
import { useState } from 'react'

const TEXT_COLORS = [
  { color: '#fff', label: 'White' },
  { color: '#FF8383', label: 'Red' },
  { color: '#3A994C', label: 'Green' },
  { color: '#56A2E8', label: 'Blue' },
  { color: '#FFD700', label: 'Gold' },
]

const FONT_SIZES = [
  { value: 'S', label: 'S', px: 14 },
  { value: 'M', label: 'M', px: 18 },
  { value: 'L', label: 'L', px: 24 },
  { value: 'XL', label: 'XL', px: 32 },
]

const FONTS = [
  { value: 'lixFont', label: 'LixFont' },
  { value: 'lixCode', label: 'LixCode' },
  { value: 'lixDefault', label: 'LixDefault' },
  { value: 'lixFancy', label: 'LixFancy' },
]

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
  'sql', 'bash', 'json', 'yaml', 'markdown',
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

export default function TextSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const [textColor, setTextColor] = useState('#fff')
  const [fontSize, setFontSize] = useState('M')
  const [font, setFont] = useState('lixFont')
  const [fontExpanded, setFontExpanded] = useState(false)
  const [codeMode, setCodeMode] = useState(false)
  const [language, setLanguage] = useState('javascript')
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)

  const visible = activeTool === TOOLS.TEXT || activeTool === TOOLS.CODE

  return (
    <ShapeSidebar visible={visible} title="Text">
      <ColorSwatches
        colors={TEXT_COLORS}
        selected={textColor}
        onSelect={setTextColor}
        label="Color"
      />

      {/* Font selector */}
      <div className="mb-3">
        <button
          onClick={() => setFontExpanded(!fontExpanded)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-text-secondary text-xs hover:bg-surface-hover transition-all duration-200"
        >
          <span style={{ fontFamily: font }}>{font}</span>
          <i className={`bx bx-chevron-${fontExpanded ? 'up' : 'down'} text-sm`} />
        </button>
        {fontExpanded && (
          <div className="mt-1 flex flex-col gap-0.5">
            {FONTS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setFont(f.value)
                  setFontExpanded(false)
                }}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                  font === f.value
                    ? 'bg-surface-active text-text-primary'
                    : 'text-text-muted hover:bg-surface-hover'
                }`}
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font size */}
      <div className="mb-3">
        <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Size</p>
        <div className="flex items-center gap-1">
          {FONT_SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFontSize(s.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] transition-all duration-200 ${
                fontSize === s.value
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Code mode toggle */}
      <div className="mb-3">
        <button
          onClick={() => setCodeMode(!codeMode)}
          className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs transition-all duration-200 ${
            codeMode
              ? 'bg-surface-active text-text-primary'
              : 'text-text-muted hover:bg-surface-hover'
          }`}
        >
          <span className="flex items-center gap-2">
            <i className="bx bx-code-alt text-sm" />
            Code Mode
          </span>
          <div
            className={`w-8 h-4 rounded-full transition-all duration-200 relative ${
              codeMode ? 'bg-accent-blue' : 'bg-surface-dark'
            }`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${
                codeMode ? 'left-4' : 'left-0.5'
              }`}
            />
          </div>
        </button>
      </div>

      {/* Language selector (shown when code mode is on) */}
      {codeMode && (
        <div className="relative">
          <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1.5">Language</p>
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-text-secondary text-xs bg-surface-dark border border-border hover:border-border-light transition-all duration-200"
          >
            {language}
            <i className={`bx bx-chevron-${langDropdownOpen ? 'up' : 'down'} text-sm`} />
          </button>
          {langDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-dark border border-border-light rounded-lg max-h-[160px] overflow-y-auto no-scrollbar z-10">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang)
                    setLangDropdownOpen(false)
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs transition-all duration-200 ${
                    language === lang
                      ? 'bg-surface-active text-text-primary'
                      : 'text-text-muted hover:bg-surface-hover'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </ShapeSidebar>
  )
}
