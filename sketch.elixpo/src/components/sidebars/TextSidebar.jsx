"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import ShapeSidebar, { ToolbarButton, Divider } from './ShapeSidebar'
import { useState, useCallback, useEffect } from 'react'

const TEXT_COLORS = ['#fff', '#FF8383', '#3A994C', '#56A2E8', '#FFD700', '#FF69B4', '#A855F7']

const FONTS = [
  { value: 'lixFont', label: 'Lix' },
  { value: 'lixCode', label: 'Code' },
  { value: 'lixDefault', label: 'Default' },
  { value: 'lixFancy', label: 'Fancy' },
]

const SIZE_MAP = { S: '20px', M: '30px', L: '48px', XL: '72px' }

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
  'sql', 'bash', 'json', 'yaml', 'markdown',
]

export default function TextSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const selectedShapeSidebar = useSketchStore((s) => s.selectedShapeSidebar)
  const [textColor, setTextColor] = useState('#fff')
  const [fontSize, setFontSize] = useState('M')
  const [font, setFont] = useState('lixFont')
  const [codeMode, setCodeMode] = useState(false)
  const [language, setLanguage] = useState('javascript')

  // Sync code mode state from engine when a shape is selected
  useEffect(() => {
    window.__onCodeModeChanged = (isCode) => {
      setCodeMode(isCode)
      window.isTextInCodeMode = isCode
    }
    return () => { window.__onCodeModeChanged = null }
  }, [])

  const updateColor = useCallback((c) => {
    setTextColor(c)
    if (window.updateSelectedTextStyle) window.updateSelectedTextStyle({ color: c })
  }, [])

  const updateFont = useCallback((f) => {
    setFont(f)
    if (window.updateSelectedTextStyle) window.updateSelectedTextStyle({ font: f })
  }, [])

  const updateSize = useCallback((s) => {
    setFontSize(s)
    if (window.updateSelectedTextStyle) window.updateSelectedTextStyle({ fontSize: SIZE_MAP[s] })
  }, [])

  const toggleCodeMode = useCallback(() => {
    const next = !codeMode
    setCodeMode(next)
    window.isTextInCodeMode = next
    if (next) {
      // Convert selected text → code
      if (window.__convertTextToCode) window.__convertTextToCode()
    } else {
      // Convert selected code → text
      if (window.__convertCodeToText) window.__convertCodeToText()
    }
  }, [codeMode])

  const updateLanguage = useCallback((lang) => {
    setLanguage(lang)
    if (window.__setCodeLanguage) window.__setCodeLanguage(lang)
  }, [])

  const visible = activeTool === TOOLS.TEXT || activeTool === TOOLS.CODE || selectedShapeSidebar === 'text'

  return (
    <ShapeSidebar visible={visible}>
      {/* Color */}
      <ToolbarButton tooltip="Text color"
        preview={<span className="w-4 h-4 rounded-md border border-white/20" style={{ backgroundColor: textColor }} />}
      >
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Color</p>
        <div className="grid grid-cols-4 gap-1.5">
          {TEXT_COLORS.map((c) => (
            <button key={c} onClick={() => updateColor(c)}
              className={`w-7 h-7 rounded-md border-[1.5px] transition-all duration-100 ${textColor === c ? 'border-[#5B57D1] scale-110' : 'border-white/[0.08] hover:border-white/20'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </ToolbarButton>

      {!codeMode && (
        <>
          <Divider />

          {/* Font */}
          <ToolbarButton icon="bxs-font-family" tooltip="Font">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Font</p>
            <div className="flex flex-col gap-0.5">
              {FONTS.map((f) => (
                <button key={f.value} onClick={() => updateFont(f.value)}
                  className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${font === f.value ? 'bg-[#5B57D1] text-white' : 'text-text-secondary hover:bg-white/[0.06]'}`}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </ToolbarButton>
        </>
      )}

      <Divider />

      {/* Size */}
      <ToolbarButton icon="bxs-chevrons-up" tooltip="Size">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Size</p>
        <div className="flex items-center gap-1">
          {['S', 'M', 'L', 'XL'].map((s) => (
            <button key={s} onClick={() => updateSize(s)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all duration-100 ${fontSize === s ? 'bg-[#5B57D1]/20 text-[#5B57D1]' : 'text-text-muted hover:bg-white/[0.06]'}`}
            >{s}</button>
          ))}
        </div>
      </ToolbarButton>

      <Divider />

      {/* Code mode */}
      <ToolbarButton icon="bxs-terminal" tooltip="Code mode">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Code</p>
        <div className="flex flex-col gap-2">
          <button onClick={toggleCodeMode}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${codeMode ? 'bg-[#5B57D1] text-white' : 'text-text-secondary hover:bg-white/[0.06]'}`}
          >
            <div className={`w-6 h-3 rounded-full transition-all duration-150 relative ${codeMode ? 'bg-white/30' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all duration-150 ${codeMode ? 'left-3.5' : 'left-0.5'}`} />
            </div>
            {codeMode ? 'On' : 'Off'}
          </button>
          {codeMode && (
            <div className="flex flex-wrap gap-1 max-w-[180px]">
              {LANGUAGES.map((lang) => (
                <button key={lang} onClick={() => updateLanguage(lang)}
                  className={`px-1.5 py-0.5 rounded text-[9px] transition-all duration-100 ${language === lang ? 'bg-[#5B57D1]/20 text-[#5B57D1]' : 'text-text-dim hover:bg-white/[0.06] hover:text-text-secondary'}`}
                >{lang}</button>
              ))}
            </div>
          )}
        </div>
      </ToolbarButton>
    </ShapeSidebar>
  )
}
