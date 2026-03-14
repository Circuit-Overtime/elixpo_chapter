"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import useUIStore from '@/store/useUIStore'
import useAuthStore from '@/store/useAuthStore'
import { WORKER_URL } from '@/lib/env'

const MODELS = [
  { id: 'gptimage', label: 'GPT Image', desc: 'Photorealistic' },
  { id: 'flux', label: 'Flux', desc: 'Detailed, artistic' },
  { id: 'zimage', label: 'ZImage', desc: 'Fast, high quality' },
  { id: 'dirtberry', label: 'Dirtberry', desc: 'Creative, stylized' },
  { id: 'grok-imagine', label: 'Grok Imagine', desc: 'Expressive, bold' },
  { id: 'klien', label: 'Klien', desc: 'Clean, precise' },
]

const SIZES = [
  { label: '768×768', w: 768, h: 768 },
  { label: '768×512', w: 768, h: 512 },
  { label: '512×768', w: 512, h: 768 },
  { label: '512×512', w: 512, h: 512 },
]

function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <style>{`
        @keyframes rgb-glob {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          25% { transform: translate(12px, -8px) scale(1.15); opacity: 0.9; }
          50% { transform: translate(-6px, 10px) scale(0.9); opacity: 0.6; }
          75% { transform: translate(-10px, -5px) scale(1.1); opacity: 0.85; }
        }
        @keyframes rgb-glob-2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          25% { transform: translate(-10px, 6px) scale(1.1); opacity: 0.85; }
          50% { transform: translate(8px, -10px) scale(0.95); opacity: 0.7; }
          75% { transform: translate(6px, 8px) scale(1.15); opacity: 0.9; }
        }
        @keyframes rgb-glob-3 {
          0%, 100% { transform: translate(0, 0) scale(1.05); opacity: 0.65; }
          25% { transform: translate(8px, 10px) scale(0.9); opacity: 0.8; }
          50% { transform: translate(-12px, -4px) scale(1.1); opacity: 0.55; }
          75% { transform: translate(4px, -12px) scale(1); opacity: 0.9; }
        }
        @keyframes icon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>

      <div className="relative w-20 h-20">
        {/* Blurred RGB globs */}
        <div
          className="absolute rounded-full"
          style={{
            width: 38, height: 38, top: 2, left: 2,
            background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)',
            filter: 'blur(10px)',
            animation: 'rgb-glob 3.5s ease-in-out infinite',
            willChange: 'transform, opacity',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 34, height: 34, top: 14, right: 0,
            background: 'radial-gradient(circle, rgba(168,85,247,0.55) 0%, transparent 70%)',
            filter: 'blur(10px)',
            animation: 'rgb-glob-2 4s ease-in-out infinite',
            willChange: 'transform, opacity',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 32, height: 32, bottom: 0, left: 10,
            background: 'radial-gradient(circle, rgba(236,72,153,0.5) 0%, transparent 70%)',
            filter: 'blur(10px)',
            animation: 'rgb-glob-3 3.8s ease-in-out infinite',
            willChange: 'transform, opacity',
          }}
        />
        {/* Subtle green accent */}
        <div
          className="absolute rounded-full"
          style={{
            width: 26, height: 26, top: 6, right: 10,
            background: 'radial-gradient(circle, rgba(52,211,153,0.35) 0%, transparent 70%)',
            filter: 'blur(8px)',
            animation: 'rgb-glob 4.5s ease-in-out infinite reverse',
            willChange: 'transform, opacity',
          }}
        />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'icon-float 2.5s ease-in-out infinite' }}>
          <div className="w-9 h-9 rounded-lg bg-black/30 backdrop-blur-sm border border-white/[0.08] flex items-center justify-center">
            <i className="bx bx-image-alt text-xl text-white/70" />
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-text-dim text-sm">Generating image...</p>
    </div>
  )
}

export default function ImageGenerateModal() {
  const isOpen = useUIStore((s) => s.imageGenerateModalOpen)
  const closeModal = useUIStore((s) => s.closeImageGenerateModal)

  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [model, setModel] = useState('gptimage')
  const [sizeIdx, setSizeIdx] = useState(0)
  const [enhance, setEnhance] = useState(true)
  const [seed, setSeed] = useState(-1)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState(null) // { imageUrl, width, height }
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [brushSize, setBrushSize] = useState(30)
  const canvasRef = useRef(null)
  const maskCanvasRef = useRef(null)
  const isDrawingRef = useRef(false)

  // Quota
  const [genQuota, setGenQuota] = useState({ used: 0, limit: 10, remaining: 10 })
  const [editQuota, setEditQuota] = useState({ used: 0, limit: 5, remaining: 5 })

  // Fetch quotas on open
  useEffect(() => {
    if (!isOpen) return
    const authState = useAuthStore.getState()
    const params = new URLSearchParams()
    if (authState.isAuthenticated && authState.user?.id) {
      params.set('userId', authState.user.id)
    } else {
      params.set('guestId', localStorage.getItem('lixsketch-guest-session') || 'anonymous')
    }

    fetch(`${WORKER_URL}/api/ai/image?${params}&type=gen`)
      .then(r => r.json())
      .then(d => {
        if (d.used !== undefined) setGenQuota({
          used: d.used,
          limit: d.limit === 'unlimited' ? Infinity : d.limit,
          remaining: d.remaining === 'unlimited' ? Infinity : d.remaining,
        })
      }).catch(() => {})

    fetch(`${WORKER_URL}/api/ai/image?${params}&type=edit`)
      .then(r => r.json())
      .then(d => {
        if (d.used !== undefined) setEditQuota({
          used: d.used,
          limit: d.limit === 'unlimited' ? Infinity : d.limit,
          remaining: d.remaining === 'unlimited' ? Infinity : d.remaining,
        })
      }).catch(() => {})
  }, [isOpen])

  const handleClose = useCallback(() => {
    if (isGenerating && abortRef.current) {
      abortRef.current.abort()
    }
    closeModal()
    setError('')
    setEditMode(false)
    setEditPrompt('')
  }, [closeModal, isGenerating])

  const handleReset = useCallback(() => {
    setGeneratedImage(null)
    setEditMode(false)
    setEditPrompt('')
    setError('')
  }, [])

  // --- Generate Image ---
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return

    if (genQuota.remaining !== Infinity && genQuota.remaining <= 0) {
      setError(`Daily image generation limit reached (${genQuota.used}/${genQuota.limit})`)
      return
    }

    setIsGenerating(true)
    setError('')
    setGeneratedImage(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const authState = useAuthStore.getState()
      const size = SIZES[sizeIdx]
      const reqBody = {
        prompt: prompt.trim(),
        model,
        width: size.w,
        height: size.h,
        enhance,
        seed: seed === -1 ? -1 : seed,
      }
      if (negativePrompt.trim()) reqBody.negative_prompt = negativePrompt.trim()
      if (authState.isAuthenticated && authState.user?.id) {
        reqBody.userId = authState.user.id
      } else {
        reqBody.guestId = localStorage.getItem('lixsketch-guest-session') || 'anonymous'
      }

      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Generation failed')
        setIsGenerating(false)
        abortRef.current = null
        return
      }

      setGeneratedImage({ imageUrl: data.imageUrl, width: data.width, height: data.height })
      if (data.used !== undefined) {
        setGenQuota({
          used: data.used,
          limit: data.limit === 'unlimited' ? Infinity : data.limit,
          remaining: data.remaining === 'unlimited' ? Infinity : data.remaining,
        })
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Connection failed. Please try again.')
      }
    }
    setIsGenerating(false)
    abortRef.current = null
  }, [prompt, negativePrompt, model, sizeIdx, enhance, seed, isGenerating, genQuota])

  // --- Place image on canvas ---
  const handlePlace = useCallback(() => {
    if (!generatedImage) return

    // Create image element and place on canvas
    if (window.svg && window.ImageShape) {
      const vb = window.currentViewBox || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
      const cx = vb.x + vb.width / 2
      const cy = vb.y + vb.height / 2

      const imgEl = document.createElementNS('http://www.w3.org/2000/svg', 'image')
      const aspectRatio = generatedImage.height / generatedImage.width
      const displayW = Math.min(400, generatedImage.width)
      const displayH = displayW * aspectRatio

      imgEl.setAttribute('href', generatedImage.imageUrl)
      imgEl.setAttribute('x', cx - displayW / 2)
      imgEl.setAttribute('y', cy - displayH / 2)
      imgEl.setAttribute('width', displayW)
      imgEl.setAttribute('height', displayH)
      imgEl.setAttribute('data-shape-x', cx - displayW / 2)
      imgEl.setAttribute('data-shape-y', cy - displayH / 2)
      imgEl.setAttribute('data-shape-width', displayW)
      imgEl.setAttribute('data-shape-height', displayH)
      imgEl.setAttribute('type', 'image')

      const imageShape = new window.ImageShape(imgEl)
      window.shapes.push(imageShape)
      if (window.pushCreateAction) window.pushCreateAction(imageShape)
    }

    handleClose()
    handleReset()
  }, [generatedImage, handleClose, handleReset])

  // --- Edit mode: brush drawing on mask canvas ---
  const initEditCanvas = useCallback(() => {
    if (!generatedImage || !canvasRef.current || !maskCanvasRef.current) return

    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    const img = new Image()
    img.onload = () => {
      const container = canvas.parentElement
      const maxW = container ? container.clientWidth - 16 : 500
      const maxH = 280
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      canvas.width = w
      canvas.height = h
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      maskCanvas.width = w
      maskCanvas.height = h
      maskCanvas.style.width = w + 'px'
      maskCanvas.style.height = h + 'px'

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      const mctx = maskCanvas.getContext('2d')
      mctx.clearRect(0, 0, w, h)
    }
    img.src = generatedImage.imageUrl
  }, [generatedImage])

  useEffect(() => {
    if (editMode) initEditCanvas()
  }, [editMode, initEditCanvas])

  const startDraw = useCallback((e) => {
    isDrawingRef.current = true
    const mctx = maskCanvasRef.current?.getContext('2d')
    if (!mctx) return
    const rect = maskCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    mctx.globalCompositeOperation = 'source-over'
    mctx.fillStyle = 'rgba(139, 92, 246, 0.18)'
    mctx.beginPath()
    mctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    mctx.fill()
  }, [brushSize])

  const draw = useCallback((e) => {
    if (!isDrawingRef.current) return
    const mctx = maskCanvasRef.current?.getContext('2d')
    if (!mctx) return
    const rect = maskCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    mctx.globalCompositeOperation = 'source-over'
    mctx.fillStyle = 'rgba(139, 92, 246, 0.18)'
    mctx.beginPath()
    mctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    mctx.fill()
  }, [brushSize])

  const stopDraw = useCallback(() => {
    isDrawingRef.current = false
  }, [])

  const clearMask = useCallback(() => {
    const mctx = maskCanvasRef.current?.getContext('2d')
    if (mctx) mctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
  }, [])

  // --- Edit image with AI ---
  const handleEdit = useCallback(async () => {
    if (!editPrompt.trim() || !generatedImage || isEditing) return

    if (editQuota.remaining !== Infinity && editQuota.remaining <= 0) {
      setError(`Daily image edit limit reached (${editQuota.used}/${editQuota.limit})`)
      return
    }

    setIsEditing(true)
    setError('')

    try {
      const authState = useAuthStore.getState()
      const reqBody = {
        prompt: editPrompt.trim(),
        model: 'gptimage',
        width: generatedImage.width,
        height: generatedImage.height,
        enhance: true,
        referenceImage: generatedImage.imageUrl,
      }
      if (authState.isAuthenticated && authState.user?.id) {
        reqBody.userId = authState.user.id
      } else {
        reqBody.guestId = localStorage.getItem('lixsketch-guest-session') || 'anonymous'
      }

      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Edit failed')
        setIsEditing(false)
        return
      }

      setGeneratedImage({ imageUrl: data.imageUrl, width: data.width, height: data.height })
      setEditMode(false)
      setEditPrompt('')
      if (data.used !== undefined) {
        setEditQuota({
          used: data.used,
          limit: data.limit === 'unlimited' ? Infinity : data.limit,
          remaining: data.remaining === 'unlimited' ? Infinity : data.remaining,
        })
      }
    } catch {
      setError('Edit failed. Please try again.')
    }
    setIsEditing(false)
  }, [editPrompt, generatedImage, isEditing, editQuota])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (generatedImage && !editMode) handlePlace()
      else if (editMode) handleEdit()
      else handleGenerate()
    }
    if (e.key === 'Escape') handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center font-[lixFont]" onClick={handleClose} onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative bg-surface-card border border-border-light rounded-2xl p-5 sm:p-6 mx-3 overflow-y-auto no-scrollbar transition-all duration-300 w-[92vw] max-w-[900px] max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {(generatedImage || editMode) && (
              <button
                onClick={editMode ? () => setEditMode(false) : handleReset}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
              >
                <i className="bx bx-arrow-back text-lg" />
              </button>
            )}
            <h2 className="text-text-primary text-lg font-medium flex items-center gap-2.5">
              <i className={`bx ${editMode ? 'bx-edit' : 'bx-image-alt'} text-xl ${editMode ? 'text-purple-400' : 'text-accent-blue'}`} />
              {editMode ? 'Edit Image' : generatedImage ? 'Preview' : 'AI Image Generator'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Quota badges */}
            {genQuota.limit !== Infinity && (
              <span className="text-[10px] text-text-dim px-2 py-1 bg-surface-dark rounded-lg">
                <i className="bx bx-image-alt mr-1" />{genQuota.remaining}/{genQuota.limit}
              </span>
            )}
            {editQuota.limit !== Infinity && (
              <span className="text-[10px] text-text-dim px-2 py-1 bg-surface-dark rounded-lg">
                <i className="bx bx-edit mr-1" />{editQuota.remaining}/{editQuota.limit}
              </span>
            )}
            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all">
              <i className="bx bx-x text-2xl" />
            </button>
          </div>
        </div>

        <style>{`
          @keyframes preview-fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        <div className="flex gap-5">
          {/* Left: Controls / Edit Mode */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {editMode && generatedImage ? (
              /* ============ EDIT CONTROLS ============ */
              <>
                <p className="text-text-muted text-xs uppercase tracking-wider">Paint over areas to edit, then describe changes</p>

                {/* Brush controls */}
                <div className="flex items-center gap-3">
                  <span className="text-text-dim text-xs">Brush</span>
                  <input
                    type="range" min="10" max="80" value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="flex-1 h-1 accent-purple-500"
                  />
                  <span className="text-text-dim text-xs w-8">{brushSize}px</span>
                  <button onClick={clearMask} className="px-2 py-1 text-[10px] text-text-dim border border-white/10 rounded-lg hover:border-white/20 transition-all">
                    Clear
                  </button>
                </div>

                {/* Canvas with mask overlay */}
                <div className="flex justify-center rounded-xl bg-[#111] border border-white/[0.06] overflow-hidden p-2" style={{ minHeight: 200 }}>
                  <div className="relative inline-block">
                    <canvas ref={canvasRef} className="block" />
                    <canvas
                      ref={maskCanvasRef}
                      className="absolute top-0 left-0 cursor-crosshair"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                    />
                  </div>
                </div>

                {/* Edit prompt */}
                <div className="flex gap-2">
                  <input
                    type="text" value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit() } }}
                    placeholder='e.g., "Change background to sunset"'
                    className="flex-1 bg-surface-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-purple-500 placeholder:text-text-dim"
                    disabled={isEditing}
                    autoFocus
                  />
                  <button
                    onClick={handleEdit}
                    disabled={!editPrompt.trim() || isEditing}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                      !editPrompt.trim() || isEditing ? 'bg-surface-hover text-text-dim cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-500'
                    }`}
                  >
                    {isEditing ? (
                      <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-white animate-spin" />
                    ) : (
                      <i className="bx bx-brush text-base" />
                    )}
                    Apply
                  </button>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}
              </>
            ) : (
              /* ============ GENERATE CONTROLS ============ */
              <>
                {/* Prompt */}
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Describe your image</p>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleGenerate() }
                      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) { e.preventDefault(); handleGenerate() }
                    }}
                    placeholder='e.g., "System architecture diagram with microservices, API gateway, load balancer, and database clusters connected by arrows"'
                    className="w-full bg-surface-dark border border-border rounded-xl px-4 py-3 text-text-primary text-sm leading-relaxed resize-none focus:outline-none focus:border-accent-blue placeholder:text-text-dim h-24"
                    disabled={isGenerating}
                    autoFocus
                  />
                </div>

                {/* Model selection */}
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Model</p>
                  <div className="flex gap-2">
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm transition-all border ${
                          model === m.id
                            ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                            : 'bg-surface-dark border-white/[0.06] text-text-muted hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="font-medium text-xs">{m.label}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size selection */}
                <div>
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Size</p>
                  <div className="flex gap-1.5">
                    {SIZES.map((s, i) => (
                      <button
                        key={s.label}
                        onClick={() => setSizeIdx(i)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] transition-all border ${
                          sizeIdx === i
                            ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                            : 'bg-surface-dark border-white/[0.06] text-text-dim hover:border-white/[0.15]'
                        }`}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>

                {/* Advanced settings */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 text-text-dim text-xs hover:text-text-muted transition-all"
                  >
                    <i className={`bx bx-chevron-${showAdvanced ? 'up' : 'down'} text-sm`} />
                    Advanced
                  </button>
                  {showAdvanced && (
                    <div className="mt-2 flex flex-col gap-3 pl-1">
                      <div>
                        <label className="text-text-dim text-[10px] uppercase tracking-wider mb-1 block">Negative Prompt</label>
                        <input
                          type="text" value={negativePrompt}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          placeholder="What to avoid (e.g., blurry, low quality)"
                          className="w-full bg-surface-dark border border-border rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:border-accent-blue placeholder:text-text-dim"
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEnhance(!enhance)}
                            className="flex items-center gap-2 text-text-dim text-xs hover:text-text-muted transition-all"
                          >
                            <div className={`w-7 h-4 rounded-full transition-all relative ${enhance ? 'bg-accent-blue' : 'bg-white/10'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${enhance ? 'left-3.5' : 'left-0.5'}`} />
                            </div>
                            Enhance prompt
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-text-dim text-[10px]">Seed</label>
                          <input
                            type="number" value={seed}
                            onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                            className="w-20 bg-surface-dark border border-border rounded-lg px-2 py-1 text-text-primary text-xs focus:outline-none focus:border-accent-blue"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate / Stop button */}
                <div className="mt-auto pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-text-dim text-xs">Enter or Ctrl+Enter to generate</span>
                    {isGenerating ? (
                      <button
                        onClick={() => { abortRef.current?.abort(); setIsGenerating(false) }}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-500/80 text-white hover:bg-red-500 transition-all flex items-center gap-2"
                      >
                        <i className="bx bx-stop text-base" />
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerate}
                        disabled={!prompt.trim()}
                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          !prompt.trim() ? 'bg-surface-hover text-text-dim cursor-not-allowed' : 'bg-accent-blue text-white hover:bg-accent-blue/80'
                        }`}
                      >
                        <i className="bx bx-image-alt text-base" />
                        Generate
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Preview panel — stays the same size always */}
          <div className="w-[340px] min-w-[300px] flex flex-col">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Preview</p>
            <div className="flex-1 flex flex-col rounded-xl bg-[#111] border border-white/[0.06] min-h-[340px] overflow-hidden">
              {/* Image / Loading / Empty state */}
              <div className="flex-1 flex items-center justify-center p-3">
                {isGenerating || isEditing ? (
                  <LoadingAnimation />
                ) : generatedImage ? (
                  <img
                    key={generatedImage.imageUrl}
                    src={generatedImage.imageUrl}
                    alt="Generated"
                    className="max-w-full max-h-[280px] rounded-lg object-contain"
                    style={{ animation: 'preview-fade-in 0.4s ease-out' }}
                  />
                ) : error ? (
                  <div className="text-center px-6">
                    <i className="bx bx-error-circle text-3xl text-red-400/50 mb-2" />
                    <p className="text-red-400/70 text-sm">{error}</p>
                    <button onClick={() => setError('')} className="mt-2 text-text-dim text-xs hover:text-text-muted">Dismiss</button>
                  </div>
                ) : (
                  <div className="text-center px-6">
                    <i className="bx bx-image-alt text-4xl text-text-dim/20 mb-3" />
                    <p className="text-text-dim text-sm">Your image will appear here</p>
                    <p className="text-text-dim/40 text-[10px] mt-1">Describe what you want and hit Generate</p>
                  </div>
                )}
              </div>

              {/* Action buttons — only when image is ready */}
              {generatedImage && !isGenerating && !isEditing && (
                <div className="border-t border-white/[0.06] p-2.5 flex flex-col gap-2" style={{ animation: 'preview-fade-in 0.4s ease-out 0.1s both' }}>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handlePlace}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/80 transition-all flex items-center justify-center gap-1.5"
                    >
                      <i className="bx bx-check text-sm" />
                      Place on Canvas
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 py-2 rounded-lg text-xs text-text-muted border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5"
                    >
                      <i className="bx bx-refresh text-sm" />
                      New
                    </button>
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    disabled={editQuota.remaining !== Infinity && editQuota.remaining <= 0}
                    className="w-full px-3 py-2 rounded-lg text-xs text-text-muted border border-white/10 hover:border-purple-500/50 hover:text-purple-400 transition-all flex items-center justify-center gap-1.5"
                  >
                    <i className="bx bx-edit text-sm" />
                    Edit with AI
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
