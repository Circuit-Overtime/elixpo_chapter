"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import useUIStore from '@/store/useUIStore'

// Floating toast that shows AI generation progress — lives outside the modal
function AIToast({ status, message, onDismiss }) {
  if (!status) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] animate-slide-up font-[lixFont]">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 ${
        status === 'loading'
          ? 'bg-surface-card/90 border-accent-blue/30'
          : status === 'success'
          ? 'bg-surface-card/90 border-green-500/30'
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
            <span className="text-text-primary text-sm">Diagram placed on canvas</span>
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
function DiagramPreview({ svgMarkup }) {
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  // Reset zoom/pan when new diagram loaded
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [svgMarkup])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.max(0.3, Math.min(3, z * delta)))
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    isPanningRef.current = true
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isPanningRef.current) return
    const dx = e.clientX - lastPosRef.current.x
    const dy = e.clientY - lastPosRef.current.y
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
  }, [])

  if (!svgMarkup) return null

  return (
    <div
      ref={containerRef}
      className="w-full h-[clamp(200px,40vh,400px)] rounded-xl bg-[#111] border border-white/[0.06] overflow-hidden cursor-grab active:cursor-grabbing relative select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      {/* Zoom controls */}
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

  // Preview state
  const [previewDiagram, setPreviewDiagram] = useState(null)
  const [previewSVG, setPreviewSVG] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [chatHistory, setChatHistory] = useState([])

  // Frame editing mode — set by FrameSidebar's AI edit button
  const [editingFrame, setEditingFrame] = useState(null)

  const editInputRef = useRef(null)

  // Auto-dismiss success toast
  useEffect(() => {
    if (toast.status === 'success') {
      const t = setTimeout(() => setToast({ status: null, message: '' }), 2500)
      return () => clearTimeout(t)
    }
  }, [toast.status])

  // Check if opened for frame editing — show current frame as preview
  useEffect(() => {
    if (aiModalOpen && window.__aiEditTargetFrame) {
      const frame = window.__aiEditTargetFrame
      window.__aiEditTargetFrame = null
      setEditingFrame(frame)
      setMode('describe')
      setPrompt('')
      setChatHistory([])

      // Generate preview from existing frame contents
      if (window.__aiFramePreview) {
        const frameSvg = window.__aiFramePreview(frame)
        setPreviewSVG(frameSvg)
        // Set a minimal "diagram" object so the preview section renders
        setPreviewDiagram({ nodes: [{ id: '_existing' }], edges: [], _fromFrame: true })
      } else {
        setPreviewDiagram(null)
        setPreviewSVG('')
      }
    }
  }, [aiModalOpen])

  // Focus edit input when preview appears
  useEffect(() => {
    if (previewDiagram && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [previewDiagram])

  const resetPreview = useCallback(() => {
    setPreviewDiagram(null)
    setPreviewSVG('')
    setEditPrompt('')
    setChatHistory([])
    setPrompt('')
    setEditingFrame(null)
  }, [])

  const handleClose = useCallback(() => {
    toggleAIModal()
    setEditingFrame(null)
    window.__aiEditTargetFrame = null
  }, [toggleAIModal])

  // Generate preview (don't place on canvas yet)
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return

    const currentPrompt = prompt.trim()
    const isMermaid = mode === 'mermaid'

    // MERMAID: parse locally, show preview
    if (isMermaid) {
      if (window.__mermaidParser) {
        const diagram = window.__mermaidParser(currentPrompt)
        if (diagram) {
          setPreviewDiagram(diagram)
          if (window.__aiPreview) setPreviewSVG(window.__aiPreview(diagram))
          setChatHistory([{ role: 'user', content: currentPrompt }])
        } else {
          setToast({ status: 'error', message: 'Invalid Mermaid syntax. Check your input.' })
        }
      } else {
        setToast({ status: 'error', message: 'Mermaid parser not ready' })
      }
      return
    }

    // TEXT-TO-DIAGRAM: call AI, show preview
    setIsGenerating(true)

    try {
      const messages = [...chatHistory, { role: 'user', content: currentPrompt }]

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          mode: 'text',
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
    } catch (err) {
      console.error('[AIModal] Fetch error:', err)
      setToast({ status: 'error', message: 'Connection failed. Try again.' })
    }

    setIsGenerating(false)
  }, [prompt, mode, chatHistory, previewDiagram])

  // Send an edit suggestion to refine the preview
  const handleEdit = useCallback(async (directText) => {
    const text = directText || editPrompt.trim()
    if (!text || !previewDiagram) return

    const editText = text
    setEditPrompt('')
    setIsGenerating(true)

    try {
      const newHistory = [...chatHistory, { role: 'user', content: editText }]

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editText,
          mode: 'text',
          history: chatHistory,
          previousDiagram: previewDiagram,
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
    } catch (err) {
      setToast({ status: 'error', message: 'Connection failed.' })
    }

    setIsGenerating(false)
  }, [editPrompt, previewDiagram, chatHistory])

  // Place the previewed diagram on the canvas
  const handlePlace = useCallback(() => {
    if (!previewDiagram || previewDiagram._fromFrame) return

    // If editing an existing frame, delete it and all its children
    if (editingFrame) {
      try {
        // Save contained shapes before destroy() clears the list
        const contained = editingFrame.containedShapes ? [...editingFrame.containedShapes] : []

        // destroy() releases children back to SVG root, removes frame DOM + clip
        if (typeof editingFrame.destroy === 'function') {
          editingFrame.destroy()
        }

        // Now remove the released children from shapes array and DOM
        contained.forEach(s => {
          if (!s) return
          const idx = window.shapes?.indexOf(s)
          if (idx !== -1) window.shapes.splice(idx, 1)
          if (s.group?.parentNode) s.group.parentNode.removeChild(s.group)
        })

        // Remove the frame itself from shapes array (destroy may have done this already)
        const idx = window.shapes?.indexOf(editingFrame)
        if (idx !== -1) window.shapes.splice(idx, 1)
      } catch (err) {
        console.warn('[AIModal] Failed to remove old frame:', err)
      }
    }

    handleClose()

    if (window.__aiRenderer) {
      const success = window.__aiRenderer(previewDiagram)
      if (success === false) {
        setToast({ status: 'error', message: 'Failed to render diagram' })
        return
      }
    }

    setToast({ status: 'success', message: '' })
    resetPreview()
  }, [previewDiagram, handleClose, resetPreview, editingFrame])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      previewDiagram ? handlePlace() : handleGenerate()
    }
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    }
  }

  const isFrameEdit = !!editingFrame
  const headerTitle = isFrameEdit ? `Edit: ${editingFrame.frameName || 'Frame'}` : 'AI Diagram Generator'

  return (
    <>
      <AIToast
        status={toast.status}
        message={toast.message}
        onDismiss={() => setToast({ status: null, message: '' })}
      />

      {aiModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className={`relative bg-surface-card border border-border-light rounded-2xl p-5 sm:p-8 mx-3 sm:mx-4 max-h-[90vh] overflow-y-auto transition-all duration-300 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 ${
              previewDiagram ? 'w-full max-w-[720px]' : 'w-full max-w-[580px]'
            }`}
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-primary text-lg font-medium flex items-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isFrameEdit ? 'text-[#FFD700]' : 'text-accent'}>
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                  <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
                </svg>
                {headerTitle}
              </h2>
              <div className="flex items-center gap-2">
                {previewDiagram && (
                  <button onClick={resetPreview} className="px-3 py-1.5 rounded-lg text-text-muted text-xs hover:text-text-primary hover:bg-surface-hover transition-all duration-200">
                    Start Over
                  </button>
                )}
                <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200">
                  <i className="bx bx-x text-2xl" />
                </button>
              </div>
            </div>

            {/* === INITIAL PROMPT === */}
            {!previewDiagram ? (
              <>
                {/* Mode Tabs — hide if editing a frame */}
                {!isFrameEdit && (
                  <div className="flex gap-1 mb-5 bg-surface-dark rounded-xl p-1">
                    <button
                      onClick={() => setMode('describe')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                        mode === 'describe' ? 'bg-surface-active text-text-primary' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >Describe</button>
                    <button
                      onClick={() => setMode('mermaid')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                        mode === 'mermaid' ? 'bg-surface-active text-text-primary' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >Mermaid</button>
                  </div>
                )}

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isFrameEdit
                      ? `Describe changes to "${editingFrame.frameName || 'this frame'}"...\n\ne.g. "Add an error handling step after validation"`
                      : mode === 'describe'
                      ? 'Describe a diagram...\n\ne.g. "User authentication flow with login, 2FA verification, and dashboard redirect"'
                      : 'Paste Mermaid syntax...\n\ngraph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]'
                  }
                  className={`w-full bg-surface-dark border border-border rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-text-primary text-sm leading-relaxed resize-none focus:outline-none focus:border-accent-blue placeholder:text-text-dim ${
                    mode === 'mermaid' && !isFrameEdit ? 'h-[clamp(140px,25vh,224px)] font-mono' : 'h-[clamp(100px,20vh,160px)]'
                  }`}
                  autoFocus
                  disabled={isGenerating}
                />

                <div className="flex items-center justify-between mt-5">
                  <span className="text-text-dim text-xs">Ctrl + Enter to generate</span>
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      !prompt.trim() || isGenerating
                        ? 'bg-surface-hover text-text-dim cursor-not-allowed'
                        : 'bg-accent-blue text-white hover:bg-accent-blue/80'
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
              </>
            ) : (
              /* === PREVIEW MODE === */
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-text-muted text-xs uppercase tracking-wider">
                      {previewDiagram?._fromFrame ? 'Current Frame' : 'Preview'}
                    </p>
                    {!previewDiagram?._fromFrame && (
                      <p className="text-text-dim text-xs">
                        {previewDiagram.nodes?.length || 0} nodes, {previewDiagram.edges?.length || 0} edges
                        {previewDiagram.subgraphs?.length ? `, ${previewDiagram.subgraphs.length} groups` : ''}
                      </p>
                    )}
                  </div>
                  <DiagramPreview svgMarkup={previewSVG} />
                  <p className="text-text-dim text-[10px] mt-1">Scroll to zoom, drag to pan</p>
                </div>

                {/* Edit input */}
                <div className="mb-4">
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
                        !editPrompt.trim() || isGenerating
                          ? 'bg-surface-hover text-text-dim cursor-not-allowed'
                          : 'bg-surface-active text-text-primary hover:bg-white/[0.12]'
                      }`}
                    >
                      {isGenerating ? (
                        <div className="relative w-4 h-4">
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
                        </div>
                      ) : (
                        <i className="bx bx-refresh text-base" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick edit suggestions */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {['Add more detail', 'Simplify it', 'Use left-to-right layout', 'Add error handling', 'Add icons', 'Group into subgraphs'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleEdit(suggestion)}
                      disabled={isGenerating}
                      className="px-3 py-1 rounded-lg text-[11px] text-text-dim border border-white/[0.06] hover:border-white/[0.15] hover:text-text-secondary transition-all duration-150"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-text-dim text-xs">
                    {previewDiagram?._fromFrame ? 'Send an edit to generate a new diagram' : 'Ctrl + Enter to place'}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={resetPreview} className="px-4 py-2.5 rounded-xl text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200">
                      {previewDiagram?._fromFrame ? 'Cancel' : 'Discard'}
                    </button>
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
