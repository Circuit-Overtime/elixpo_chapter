"use client"

import { useState, useEffect, useCallback } from 'react'
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
            <span className="text-text-primary text-sm">Diagram created</span>
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

export default function AIModal() {
  const aiModalOpen = useUIStore((s) => s.aiModalOpen)
  const toggleAIModal = useUIStore((s) => s.toggleAIModal)

  const [mode, setMode] = useState('describe')
  const [prompt, setPrompt] = useState('')
  const [toast, setToast] = useState({ status: null, message: '' })

  // Auto-dismiss success toast
  useEffect(() => {
    if (toast.status === 'success') {
      const t = setTimeout(() => setToast({ status: null, message: '' }), 2500)
      return () => clearTimeout(t)
    }
  }, [toast.status])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return

    const currentPrompt = prompt.trim()
    const currentMode = mode === 'describe' ? 'text' : 'mermaid'

    // Close modal immediately so user can keep working
    setPrompt('')
    toggleAIModal()

    // Show loading toast
    setToast({ status: 'loading', message: '' })

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, mode: currentMode }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        setToast({ status: 'error', message: 'Invalid server response' })
        return
      }

      if (!res.ok || data.error) {
        setToast({ status: 'error', message: data.error || `Failed (${res.status})` })
        return
      }

      if (!data.diagram || !data.diagram.nodes || data.diagram.nodes.length === 0) {
        setToast({ status: 'error', message: 'Empty diagram. Try rephrasing.' })
        return
      }

      // Render diagram on canvas
      if (window.__aiRenderer) {
        const success = window.__aiRenderer(data.diagram)
        if (success === false) {
          setToast({ status: 'error', message: 'Failed to render diagram' })
          return
        }
      }

      setToast({ status: 'success', message: '' })
    } catch (err) {
      console.error('[AIModal] Fetch error:', err)
      setToast({ status: 'error', message: 'Connection failed. Try again.' })
    }
  }, [prompt, mode, toggleAIModal])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate()
    }
  }

  return (
    <>
      {/* Toast — always rendered, even when modal is closed */}
      <AIToast
        status={toast.status}
        message={toast.message}
        onDismiss={() => setToast({ status: null, message: '' })}
      />

      {/* Modal */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]"
          onClick={toggleAIModal}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            className="relative bg-surface-card border border-border-light rounded-2xl p-8 w-[580px] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-text-primary text-lg font-medium flex items-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                  <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
                </svg>
                AI Diagram Generator
              </h2>
              <button
                onClick={toggleAIModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
              >
                <i className="bx bx-x text-2xl" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-1 mb-5 bg-surface-dark rounded-xl p-1">
              <button
                onClick={() => setMode('describe')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                  mode === 'describe'
                    ? 'bg-surface-active text-text-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Describe
              </button>
              <button
                onClick={() => setMode('mermaid')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                  mode === 'mermaid'
                    ? 'bg-surface-active text-text-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Mermaid
              </button>
            </div>

            {/* Input */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'describe'
                  ? 'Describe a diagram...\n\ne.g. "User authentication flow with login, 2FA verification, and dashboard redirect"'
                  : 'Paste Mermaid syntax...\n\ngraph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]'
              }
              className={`w-full bg-surface-dark border border-border rounded-xl px-5 py-4 text-text-primary text-sm leading-relaxed resize-none focus:outline-none focus:border-accent-blue placeholder:text-text-dim ${
                mode === 'mermaid' ? 'h-56 font-mono' : 'h-40'
              }`}
              autoFocus
            />

            {/* Footer */}
            <div className="flex items-center justify-between mt-5">
              <span className="text-text-dim text-xs">Ctrl + Enter to generate</span>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  !prompt.trim()
                    ? 'bg-surface-hover text-text-dim cursor-not-allowed'
                    : 'bg-accent-blue text-white hover:bg-accent-blue/80'
                }`}
              >
                Generate Diagram
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
