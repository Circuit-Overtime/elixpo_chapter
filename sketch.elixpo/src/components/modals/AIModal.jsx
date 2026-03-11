"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import useUIStore from '@/store/useUIStore'

const GRAPH_COLORS = [
  '#4A90D9', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E67E22', '#3498DB', '#E91E63', '#00BCD4',
]

// Floating toast that shows AI generation progress
function AIToast({ status, message, onDismiss }) {
  if (!status) return null
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] animate-slide-up font-[lixFont]">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 ${
        status === 'loading' ? 'bg-surface-card/90 border-accent-blue/30'
        : status === 'success' ? 'bg-surface-card/90 border-green-500/30'
        : 'bg-surface-card/90 border-red-500/30'
      }`}>
        {status === 'loading' && (
          <>
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-accent-blue/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-blue animate-spin" />
            </div>
            <span className="text-text-primary text-sm">Generating diagram...</span>
          </>
        )}
        {status === 'success' && (
          <>
            <i className="bx bx-check-circle text-green-400 text-lg" />
            <span className="text-text-primary text-sm">Placed on canvas</span>
          </>
        )}
        {status === 'error' && (
          <>
            <i className="bx bx-error-circle text-red-400 text-lg" />
            <span className="text-red-300 text-sm">{message}</span>
            <button onClick={onDismiss} className="text-text-dim hover:text-text-primary ml-1">
              <i className="bx bx-x text-base" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Zoomable + pannable SVG preview
function DiagramPreview({ svgMarkup, className }) {
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [svgMarkup])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.max(0.3, Math.min(3, z * delta)))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    isPanningRef.current = true
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isPanningRef.current) return
    setPan(p => ({ x: p.x + e.clientX - lastPosRef.current.x, y: p.y + e.clientY - lastPosRef.current.y }))
    lastPosRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => { isPanningRef.current = false }, [])

  if (!svgMarkup) return null

  return (
    <div
      ref={containerRef}
      className={`rounded-xl bg-[#111] border border-white/[0.06] overflow-hidden cursor-grab active:cursor-grabbing relative select-none ${className || 'w-full h-[clamp(200px,40vh,400px)]'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded-lg px-1.5 py-0.5">
        <button onClick={() => setZoom(z => Math.max(0.3, z * 0.8))} className="text-text-dim hover:text-white text-xs px-1">-</button>
        <span className="text-text-dim text-[10px] w-8 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="text-text-dim hover:text-white text-xs px-1">+</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="text-text-dim hover:text-white text-[10px] px-1 border-l border-white/10 ml-0.5 pl-1.5">Reset</button>
      </div>
    </div>
  )
}

export default function AIModal() {
  const aiModalOpen = useUIStore((s) => s.aiModalOpen)
  const toggleAIModal = useUIStore((s) => s.toggleAIModal)

  const [mode, setMode] = useState('describe')
  const [prompt, setPrompt] = useState('')
  const [toast, setToast] = useState({ status: null, message: '' })

  // Diagram preview state
  const [previewDiagram, setPreviewDiagram] = useState(null)
  const [previewSVG, setPreviewSVG] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [chatHistory, setChatHistory] = useState([])

  // Frame editing
  const [editingFrame, setEditingFrame] = useState(null)

  // Graph mode state
  const [equations, setEquations] = useState([
    { id: 1, expression: '', color: GRAPH_COLORS[0] },
  ])
  const [graphSettings, setGraphSettings] = useState({
    xMin: -10, xMax: 10, yMin: -10, yMax: 10, showGrid: true,
  })
  const [graphPreviewSVG, setGraphPreviewSVG] = useState('')
  const graphDebounceRef = useRef(null)

  // Mermaid mode state (side-by-side live preview)
  const [mermaidCode, setMermaidCode] = useState('')
  const [mermaidPreviewSVG, setMermaidPreviewSVG] = useState('')
  const [mermaidError, setMermaidError] = useState('')
  const mermaidDebounceRef = useRef(null)

  const editInputRef = useRef(null)

  // Auto-dismiss success toast
  useEffect(() => {
    if (toast.status === 'success') {
      const t = setTimeout(() => setToast({ status: null, message: '' }), 2500)
      return () => clearTimeout(t)
    }
  }, [toast.status])

  // Frame edit detection
  useEffect(() => {
    if (aiModalOpen && window.__aiEditTargetFrame) {
      const frame = window.__aiEditTargetFrame
      window.__aiEditTargetFrame = null

      // Check if it's a graph frame
      if (frame._frameType === 'graph' && frame._graphData) {
        setMode('graph')
        setEditingFrame(frame)
        const gd = frame._graphData
        setEquations(gd.equations.map((eq, i) => ({ id: i + 1, expression: eq.expression, color: eq.color || GRAPH_COLORS[i % GRAPH_COLORS.length] })))
        setGraphSettings(gd.settings || { xMin: -10, xMax: 10, yMin: -10, yMax: 10, showGrid: true })
        return
      }

      setEditingFrame(frame)
      setMode('describe')
      setPrompt('')
      setChatHistory([])
      if (window.__aiFramePreview) {
        setPreviewSVG(window.__aiFramePreview(frame))
        setPreviewDiagram({ nodes: [{ id: '_existing' }], edges: [], _fromFrame: true })
      }
    }
  }, [aiModalOpen])

  // Live graph preview (debounced)
  useEffect(() => {
    if (mode !== 'graph') return
    if (graphDebounceRef.current) clearTimeout(graphDebounceRef.current)
    graphDebounceRef.current = setTimeout(() => {
      if (window.__graphPreview) {
        const svg = window.__graphPreview(equations, graphSettings)
        setGraphPreviewSVG(svg)
      }
    }, 200)
    return () => { if (graphDebounceRef.current) clearTimeout(graphDebounceRef.current) }
  }, [equations, graphSettings, mode])

  // Live mermaid preview (debounced)
  useEffect(() => {
    if (mode !== 'mermaid') return
    if (!mermaidCode.trim()) {
      setMermaidPreviewSVG('')
      setMermaidError('')
      return
    }
    if (mermaidDebounceRef.current) clearTimeout(mermaidDebounceRef.current)
    mermaidDebounceRef.current = setTimeout(async () => {
      if (window.__mermaidPreview) {
        try {
          const svg = await window.__mermaidPreview(mermaidCode)
          if (svg) {
            setMermaidPreviewSVG(svg)
            setMermaidError('')
          } else {
            setMermaidPreviewSVG('')
            setMermaidError('Invalid syntax — check your Mermaid code')
          }
        } catch {
          setMermaidPreviewSVG('')
          setMermaidError('Parse error')
        }
      }
    }, 300)
    return () => { if (mermaidDebounceRef.current) clearTimeout(mermaidDebounceRef.current) }
  }, [mermaidCode, mode])

  useEffect(() => {
    if (previewDiagram && editInputRef.current) editInputRef.current.focus()
  }, [previewDiagram])

  const resetPreview = useCallback(() => {
    setPreviewDiagram(null)
    setPreviewSVG('')
    setEditPrompt('')
    setChatHistory([])
    setPrompt('')
    setEditingFrame(null)
    setMermaidCode('')
    setMermaidPreviewSVG('')
    setMermaidError('')
  }, [])

  const resetGraph = useCallback(() => {
    setEquations([{ id: 1, expression: '', color: GRAPH_COLORS[0] }])
    setGraphSettings({ xMin: -10, xMax: 10, yMin: -10, yMax: 10, showGrid: true })
    setGraphPreviewSVG('')
    setEditingFrame(null)
  }, [])

  const handleClose = useCallback(() => {
    toggleAIModal()
    setEditingFrame(null)
    window.__aiEditTargetFrame = null
  }, [toggleAIModal])

  // --- Diagram generation ---
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return
    const currentPrompt = prompt.trim()
    const isMermaid = mode === 'mermaid'

    if (isMermaid) {
      setIsGenerating(true)
      try {
        // Use unified mermaid preview (handles both flowchart + sequence)
        if (window.__mermaidPreview) {
          const svg = await window.__mermaidPreview(currentPrompt)
          if (svg) {
            // Store the raw source so we can re-render on canvas
            setPreviewDiagram({ _mermaidSrc: currentPrompt, _svgPreview: true })
            setPreviewSVG(svg)
            setChatHistory([{ role: 'user', content: currentPrompt }])
          } else {
            setToast({ status: 'error', message: 'Invalid Mermaid syntax.' })
          }
        } else if (window.__mermaidParser) {
          // Fallback: old sync path for flowcharts
          const diagram = window.__mermaidParser(currentPrompt)
          if (diagram) {
            setPreviewDiagram(diagram)
            if (window.__aiPreview) setPreviewSVG(window.__aiPreview(diagram))
            setChatHistory([{ role: 'user', content: currentPrompt }])
          } else {
            setToast({ status: 'error', message: 'Invalid Mermaid syntax.' })
          }
        }
      } catch {
        setToast({ status: 'error', message: 'Failed to parse Mermaid syntax.' })
      }
      setIsGenerating(false)
      return
    }

    setIsGenerating(true)
    try {
      const messages = [...chatHistory, { role: 'user', content: currentPrompt }]
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt, mode: 'text',
          history: chatHistory.length > 0 ? chatHistory : undefined,
          previousDiagram: previewDiagram || undefined,
        }),
      })
      let data
      try { data = await res.json() } catch {
        setToast({ status: 'error', message: 'Invalid server response' })
        setIsGenerating(false)
        return
      }
      if (!res.ok || data.error) {
        setToast({ status: 'error', message: data.error || `Failed (${res.status})` })
        setIsGenerating(false)
        return
      }
      if (!data.diagram?.nodes?.length) {
        setToast({ status: 'error', message: 'Empty diagram. Try rephrasing.' })
        setIsGenerating(false)
        return
      }
      setPreviewDiagram(data.diagram)
      if (window.__aiPreview) setPreviewSVG(window.__aiPreview(data.diagram))
      setChatHistory([...messages, { role: 'assistant', content: JSON.stringify(data.diagram) }])
    } catch {
      setToast({ status: 'error', message: 'Connection failed.' })
    }
    setIsGenerating(false)
  }, [prompt, mode, chatHistory, previewDiagram])

  // --- Diagram editing ---
  const handleEdit = useCallback(async (directText) => {
    const text = directText || editPrompt.trim()
    if (!text || !previewDiagram) return
    setEditPrompt('')
    setIsGenerating(true)
    try {
      const newHistory = [...chatHistory, { role: 'user', content: text }]
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text, mode: 'text',
          history: chatHistory, previousDiagram: previewDiagram,
        }),
      })
      let data
      try { data = await res.json() } catch {
        setToast({ status: 'error', message: 'Invalid server response' })
        setIsGenerating(false)
        return
      }
      if (!res.ok || data.error) {
        setToast({ status: 'error', message: data.error || `Failed (${res.status})` })
        setIsGenerating(false)
        return
      }
      if (!data.diagram?.nodes?.length) {
        setToast({ status: 'error', message: 'Edit returned empty diagram.' })
        setIsGenerating(false)
        return
      }
      setPreviewDiagram(data.diagram)
      if (window.__aiPreview) setPreviewSVG(window.__aiPreview(data.diagram))
      setChatHistory([...newHistory, { role: 'assistant', content: JSON.stringify(data.diagram) }])
    } catch {
      setToast({ status: 'error', message: 'Connection failed.' })
    }
    setIsGenerating(false)
  }, [editPrompt, previewDiagram, chatHistory])

  // --- Place diagram ---
  const handlePlace = useCallback(async () => {
    if (!previewDiagram || previewDiagram._fromFrame) return

    if (editingFrame) {
      try {
        const contained = editingFrame.containedShapes ? [...editingFrame.containedShapes] : []
        if (typeof editingFrame.destroy === 'function') editingFrame.destroy()
        contained.forEach(s => {
          if (!s) return
          const idx = window.shapes?.indexOf(s)
          if (idx !== -1) window.shapes.splice(idx, 1)
          if (s.group?.parentNode) s.group.parentNode.removeChild(s.group)
        })
        const idx = window.shapes?.indexOf(editingFrame)
        if (idx !== -1) window.shapes.splice(idx, 1)
      } catch {}
    }

    handleClose()

    // Mermaid source-based diagram (sequence or flowchart via unified renderer)
    if (previewDiagram._mermaidSrc && window.__mermaidRenderer) {
      try {
        const success = await window.__mermaidRenderer(previewDiagram._mermaidSrc)
        if (!success) {
          setToast({ status: 'error', message: 'Failed to render diagram' })
          return
        }
      } catch {
        setToast({ status: 'error', message: 'Failed to render diagram' })
        return
      }
    } else if (window.__aiRenderer) {
      const success = window.__aiRenderer(previewDiagram)
      if (success === false) {
        setToast({ status: 'error', message: 'Failed to render diagram' })
        return
      }
    }
    setToast({ status: 'success', message: '' })
    resetPreview()
  }, [previewDiagram, handleClose, resetPreview, editingFrame])

  // --- Place mermaid ---
  const handlePlaceMermaid = useCallback(async () => {
    if (!mermaidCode.trim() || !mermaidPreviewSVG) return
    handleClose()
    if (window.__mermaidRenderer) {
      try {
        const success = await window.__mermaidRenderer(mermaidCode)
        if (!success) {
          setToast({ status: 'error', message: 'Failed to render diagram' })
          return
        }
      } catch {
        setToast({ status: 'error', message: 'Failed to render diagram' })
        return
      }
    }
    setToast({ status: 'success', message: '' })
    resetPreview()
  }, [mermaidCode, mermaidPreviewSVG, handleClose, resetPreview])

  // --- Place graph ---
  const handlePlaceGraph = useCallback(() => {
    const validEquations = equations.filter(eq => eq.expression && eq.expression.trim())
    if (validEquations.length === 0) return

    // If editing existing graph frame, remove old one
    if (editingFrame && editingFrame._frameType === 'graph') {
      try {
        const contained = editingFrame.containedShapes ? [...editingFrame.containedShapes] : []
        if (typeof editingFrame.destroy === 'function') editingFrame.destroy()
        contained.forEach(s => {
          if (!s) return
          const idx = window.shapes?.indexOf(s)
          if (idx !== -1) window.shapes.splice(idx, 1)
          if (s.group?.parentNode) s.group.parentNode.removeChild(s.group)
        })
        const idx = window.shapes?.indexOf(editingFrame)
        if (idx !== -1) window.shapes.splice(idx, 1)
      } catch {}
    }

    handleClose()
    if (window.__graphRenderer) {
      const success = window.__graphRenderer(equations, graphSettings)
      if (!success) {
        setToast({ status: 'error', message: 'Failed to render graph' })
        return
      }
    }
    setToast({ status: 'success', message: '' })
    resetGraph()
  }, [equations, graphSettings, handleClose, resetGraph, editingFrame])

  // --- Graph equation helpers ---
  const addEquation = useCallback(() => {
    setEquations(prev => [
      ...prev,
      { id: Date.now(), expression: '', color: GRAPH_COLORS[prev.length % GRAPH_COLORS.length] },
    ])
  }, [])

  const removeEquation = useCallback((id) => {
    setEquations(prev => prev.length <= 1 ? prev : prev.filter(eq => eq.id !== id))
  }, [])

  const updateEquation = useCallback((id, field, value) => {
    setEquations(prev => prev.map(eq => eq.id === id ? { ...eq, [field]: value } : eq))
  }, [])

  const updateGraphSetting = useCallback((key, value) => {
    setGraphSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (mode === 'graph') handlePlaceGraph()
      else if (mode === 'mermaid') handlePlaceMermaid()
      else previewDiagram ? handlePlace() : handleGenerate()
    }
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit() }
  }

  const isFrameEdit = !!editingFrame
  const isGraphMode = mode === 'graph'
  const hasValidEquations = equations.some(eq => eq.expression && eq.expression.trim())

  return (
    <>
      <AIToast status={toast.status} message={toast.message} onDismiss={() => setToast({ status: null, message: '' })} />

      {aiModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]" onClick={handleClose}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className="relative bg-surface-card border border-border-light rounded-2xl p-5 sm:p-6 mx-3 overflow-y-auto no-scrollbar transition-all duration-300 w-[92vw] max-w-[1200px] h-[88vh] max-h-[88vh]"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with breadcrumb */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {/* Back button - shown in preview/edit mode or graph edit mode */}
                {(previewDiagram || (isFrameEdit && isGraphMode)) && (
                  <button
                    onClick={isGraphMode ? resetGraph : resetPreview}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
                    title="Back"
                  >
                    <i className="bx bx-arrow-back text-lg" />
                  </button>
                )}

                {/* Breadcrumb path */}
                <div className="flex items-center gap-1.5 text-sm">
                  {isFrameEdit ? (
                    <>
                      <span className="text-text-dim">frame</span>
                      <span className="text-text-dim">/</span>
                      <span className="text-accent-blue font-[lixCode] text-xs">{editingFrame?.shapeID || editingFrame?.frameName || 'unknown'}</span>
                    </>
                  ) : previewDiagram ? (
                    <>
                      <span className="text-text-dim">diagram</span>
                      <span className="text-text-dim">/</span>
                      <span className="text-text-muted">preview</span>
                    </>
                  ) : (
                    <h2 className="text-text-primary text-lg font-medium flex items-center gap-2.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isGraphMode ? 'text-[#4A90D9]' : mode === 'mermaid' ? 'text-[#2ECC71]' : 'text-accent'}>
                        {isGraphMode ? (
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        ) : mode === 'mermaid' ? (
                          <>
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="8" y="14" width="8" height="7" rx="1" />
                            <line x1="6.5" y1="10" x2="12" y2="14" />
                            <line x1="17.5" y1="10" x2="12" y2="14" />
                          </>
                        ) : (
                          <>
                            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                            <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
                          </>
                        )}
                      </svg>
                      {isGraphMode ? 'Graph Editor' : mode === 'mermaid' ? 'Mermaid Editor' : 'AI Diagram Generator'}
                    </h2>
                  )}
                </div>
              </div>

              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200">
                <i className="bx bx-x text-2xl" />
              </button>
            </div>

            {/* Mode Tabs */}
            {!previewDiagram && !isFrameEdit && (
              <div className="flex gap-1 mb-4 bg-surface-dark rounded-xl p-1">
                {[
                  { value: 'describe', label: 'Describe' },
                  { value: 'mermaid', label: 'Mermaid' },
                  { value: 'graph', label: 'Graph' },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setMode(t.value)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                      mode === t.value ? 'bg-surface-active text-text-primary' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >{t.label}</button>
                ))}
              </div>
            )}

            {/* ============ MERMAID MODE (side-by-side) ============ */}
            {mode === 'mermaid' && !previewDiagram && !isFrameEdit ? (
              <div className="flex gap-4 h-[calc(100%-100px)]">
                {/* Left panel - Code editor */}
                <div className="w-[45%] min-w-[280px] flex flex-col">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Mermaid Code</p>
                  <textarea
                    value={mermaidCode}
                    onChange={(e) => setMermaidCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={'graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]\n\nsequenceDiagram\n  Alice ->> Bob: Hello\n  Bob -->> Alice: Hi!'}
                    className="flex-1 bg-surface-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm leading-relaxed resize-none focus:outline-none focus:border-accent-blue placeholder:text-text-dim font-mono"
                    autoFocus
                    spellCheck={false}
                  />

                  {/* Quick examples */}
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Quick Examples</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Flowchart', code: 'graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Process]\n  B -->|No| D[End]\n  C --> D' },
                        { label: 'LR Flow', code: 'graph LR\n  A[Input] --> B(Process)\n  B --> C((Output))\n  B --> D{Check}\n  D --> A' },
                        { label: 'Sequence', code: 'sequenceDiagram\n  Alice ->> Bob: Hello Bob\n  Bob -->> Alice: Hi Alice\n  Alice ->> Bob: How are you?\n  Bob -->> Alice: Great!' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setMermaidCode(preset.code)}
                          className="px-2 py-1 rounded-lg text-[10px] text-text-dim border border-white/[0.06] hover:border-white/[0.15] hover:text-text-secondary transition-all"
                        >{preset.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Place button */}
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-text-dim text-xs">Ctrl + Enter to place</span>
                      <button
                        onClick={handlePlaceMermaid}
                        disabled={!mermaidPreviewSVG}
                        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                          !mermaidPreviewSVG ? 'bg-surface-hover text-text-dim cursor-not-allowed' : 'bg-accent-blue text-white hover:bg-accent-blue/80'
                        }`}
                      >
                        <i className="bx bx-check text-base" />
                        Place on Canvas
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right panel - Live preview */}
                <div className="flex-1 flex flex-col min-w-0">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Preview</p>
                  {mermaidError ? (
                    <div className="flex-1 flex items-center justify-center rounded-xl bg-[#111] border border-white/[0.06]">
                      <p className="text-red-400/70 text-sm">{mermaidError}</p>
                    </div>
                  ) : mermaidPreviewSVG ? (
                    <DiagramPreview svgMarkup={mermaidPreviewSVG} className="flex-1 min-h-[300px]" />
                  ) : (
                    <div className="flex-1 flex items-center justify-center rounded-xl bg-[#111] border border-white/[0.06]">
                      <p className="text-text-dim text-sm">Type Mermaid code to see a live preview</p>
                    </div>
                  )}
                  <p className="text-text-dim text-[10px] mt-1">Scroll to zoom, drag to pan</p>
                </div>
              </div>

            ) : /* ============ GRAPH MODE ============ */
            isGraphMode ? (
              <div className="flex gap-5 h-[calc(100%-100px)]">
                {/* Left panel - Equations */}
                <div className="w-[340px] min-w-[300px] flex flex-col gap-3 overflow-y-auto no-scrollbar pr-2">
                  <p className="text-text-muted text-xs uppercase tracking-wider">Equations</p>

                  {equations.map((eq, idx) => (
                    <div key={eq.id} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={eq.color}
                        onChange={(e) => updateEquation(eq.id, 'color', e.target.value)}
                        className="w-7 h-7 rounded-lg border border-white/10 cursor-pointer bg-transparent shrink-0"
                        style={{ padding: 0 }}
                      />
                      <input
                        type="text"
                        value={eq.expression}
                        onChange={(e) => updateEquation(eq.id, 'expression', e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={idx === 0 ? 'y = x^2' : idx === 1 ? 'y = sin(x)' : `equation ${idx + 1}`}
                        className="flex-1 bg-surface-dark border border-border rounded-lg px-3 py-2 text-text-primary text-sm font-[lixCode] focus:outline-none focus:border-accent-blue placeholder:text-text-dim"
                      />
                      {equations.length > 1 && (
                        <button
                          onClick={() => removeEquation(eq.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                        >
                          <i className="bx bx-x text-lg" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={addEquation}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-dim text-xs hover:text-text-secondary hover:bg-white/[0.04] transition-all border border-dashed border-white/[0.08] hover:border-white/[0.15]"
                  >
                    <i className="bx bx-plus text-sm" />
                    Add equation
                  </button>

                  {/* Range */}
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Range</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'xMin', label: 'X min' },
                        { key: 'xMax', label: 'X max' },
                        { key: 'yMin', label: 'Y min' },
                        { key: 'yMax', label: 'Y max' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="text-text-dim text-[10px] w-7">{label}</span>
                          <input
                            type="number"
                            value={graphSettings[key]}
                            onChange={(e) => updateGraphSetting(key, parseFloat(e.target.value) || 0)}
                            className="w-full bg-surface-dark border border-border rounded-lg px-2 py-1.5 text-text-primary text-xs font-[lixCode] focus:outline-none focus:border-accent-blue"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => updateGraphSetting('showGrid', !graphSettings.showGrid)}
                      className="flex items-center gap-2 mt-2.5 px-2 py-1.5 rounded-lg text-text-dim text-xs hover:text-text-secondary transition-all"
                    >
                      <div className={`w-7 h-4 rounded-full transition-all duration-150 relative ${graphSettings.showGrid ? 'bg-accent-blue' : 'bg-white/10'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-150 ${graphSettings.showGrid ? 'left-3.5' : 'left-0.5'}`} />
                      </div>
                      Show Grid
                    </button>
                  </div>

                  {/* Quick presets */}
                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                    <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Quick Examples</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Parabola', eq: 'x^2' },
                        { label: 'Sine', eq: 'sin(x)' },
                        { label: 'Cosine', eq: 'cos(x)' },
                        { label: 'Cubic', eq: 'x^3' },
                        { label: 'Sqrt', eq: 'sqrt(x)' },
                        { label: 'Exp', eq: 'exp(x)' },
                        { label: 'Log', eq: 'ln(x)' },
                        { label: '|x|', eq: 'abs(x)' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            const emptyIdx = equations.findIndex(eq => !eq.expression.trim())
                            if (emptyIdx !== -1) {
                              updateEquation(equations[emptyIdx].id, 'expression', preset.eq)
                            } else {
                              setEquations(prev => [...prev, {
                                id: Date.now(), expression: preset.eq,
                                color: GRAPH_COLORS[prev.length % GRAPH_COLORS.length],
                              }])
                            }
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] text-text-dim border border-white/[0.06] hover:border-white/[0.15] hover:text-text-secondary transition-all"
                        >{preset.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Place button */}
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-text-dim text-xs">Ctrl + Enter to place</span>
                      <button
                        onClick={handlePlaceGraph}
                        disabled={!hasValidEquations}
                        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                          !hasValidEquations ? 'bg-surface-hover text-text-dim cursor-not-allowed' : 'bg-accent-blue text-white hover:bg-accent-blue/80'
                        }`}
                      >
                        <i className="bx bx-check text-base" />
                        {editingFrame ? 'Update Graph' : 'Place on Canvas'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right panel - Live preview */}
                <div className="flex-1 flex flex-col min-w-0">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Preview</p>
                  <DiagramPreview svgMarkup={graphPreviewSVG} className="flex-1 min-h-[300px]" />
                  <p className="text-text-dim text-[10px] mt-1">Scroll to zoom, drag to pan</p>
                </div>
              </div>

            ) : !previewDiagram ? (
              /* ============ INITIAL PROMPT ============ */
              <div className="flex flex-col h-[calc(100%-100px)]">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isFrameEdit
                      ? `Describe changes to "${editingFrame?.frameName || 'this frame'}"...\n\ne.g. "Add an error handling step after validation"`
                      : mode === 'describe'
                      ? 'Describe a diagram...\n\ne.g. "User authentication flow with login, 2FA verification, and dashboard redirect"'
                      : 'Paste Mermaid syntax...\n\ngraph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]'
                  }
                  className={`w-full flex-1 bg-surface-dark border border-border rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-text-primary text-sm leading-relaxed resize-none focus:outline-none focus:border-accent-blue placeholder:text-text-dim ${
                    mode === 'mermaid' ? 'font-mono' : ''
                  }`}
                  autoFocus
                  disabled={isGenerating}
                />
                <div className="flex items-center justify-between mt-5 shrink-0">
                  <span className="text-text-dim text-xs">Ctrl + Enter to generate</span>
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      !prompt.trim() || isGenerating ? 'bg-surface-hover text-text-dim cursor-not-allowed' : 'bg-accent-blue text-white hover:bg-accent-blue/80'
                    }`}
                  >
                    {isGenerating && (
                      <div className="relative w-4 h-4">
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
                      </div>
                    )}
                    {isGenerating ? 'Generating...' : 'Preview Diagram'}
                  </button>
                </div>
              </div>
            ) : (
              /* ============ PREVIEW MODE ============ */
              <div className="flex flex-col h-[calc(100%-100px)]">
                <div className="flex-1 flex flex-col min-h-0 mb-4">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <p className="text-text-muted text-xs uppercase tracking-wider">
                      {previewDiagram?._fromFrame ? 'Current Frame' : 'Preview'}
                    </p>
                    {!previewDiagram?._fromFrame && !previewDiagram?._mermaidSrc && (
                      <p className="text-text-dim text-xs">
                        {previewDiagram.nodes?.length || 0} nodes, {previewDiagram.edges?.length || 0} edges
                        {previewDiagram.subgraphs?.length ? `, ${previewDiagram.subgraphs.length} groups` : ''}
                      </p>
                    )}
                    {previewDiagram?._mermaidSrc && (
                      <p className="text-text-dim text-xs">Mermaid Diagram</p>
                    )}
                  </div>
                  <DiagramPreview svgMarkup={previewSVG} className="flex-1 min-h-[200px]" />
                  <p className="text-text-dim text-[10px] mt-1 shrink-0">Scroll to zoom, drag to pan</p>
                </div>

                {/* AI Edit controls — only for AI-generated diagrams, not raw mermaid */}
                {!previewDiagram?._mermaidSrc && (
                  <>
                    <div className="mb-4 shrink-0">
                      <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Suggest Edits</p>
                      <div className="flex gap-2">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          placeholder='e.g. "Add an error handling step" or "Make it left-to-right"'
                          className="flex-1 bg-surface-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent-blue placeholder:text-text-dim"
                          disabled={isGenerating}
                        />
                        <button
                          onClick={() => handleEdit()}
                          disabled={!editPrompt.trim() || isGenerating}
                          className={`px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                            !editPrompt.trim() || isGenerating ? 'bg-surface-hover text-text-dim cursor-not-allowed' : 'bg-surface-active text-text-primary hover:bg-white/[0.12]'
                          }`}
                        >
                          {isGenerating ? (
                            <div className="relative w-4 h-4"><div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" /></div>
                          ) : <i className="bx bx-refresh text-base" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-5 shrink-0">
                      {['Add more detail', 'Simplify it', 'Use left-to-right layout', 'Add error handling', 'Add icons', 'Group into subgraphs'].map((s) => (
                        <button
                          key={s} onClick={() => handleEdit(s)} disabled={isGenerating}
                          className="px-3 py-1 rounded-lg text-[11px] text-text-dim border border-white/[0.06] hover:border-white/[0.15] hover:text-text-secondary transition-all duration-150"
                        >{s}</button>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between shrink-0">
                  <span className="text-text-dim text-xs">
                    {previewDiagram?._fromFrame ? 'Send an edit to generate a new diagram' : 'Ctrl + Enter to place'}
                  </span>
                  <div className="flex gap-2">
                    {!previewDiagram?._fromFrame && (
                      <button
                        onClick={handlePlace}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/80 transition-all duration-200 flex items-center gap-2"
                      >
                        <i className="bx bx-check text-base" />
                        {isFrameEdit ? 'Replace Frame' : 'Place on Canvas'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
