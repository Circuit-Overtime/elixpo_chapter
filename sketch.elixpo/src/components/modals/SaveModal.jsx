"use client"

import { useState } from 'react'
import useUIStore from '@/store/useUIStore'
import { getShareableLink } from '@/hooks/useSessionID'
import { generateKey } from '@/utils/encryption'

const SAVE_OPTIONS = [
  {
    id: 'lixsketch',
    label: 'Scene (.lixjson)',
    description: 'Save scene data for later',
    icon: 'bx-braces',
  },
  {
    id: 'pdf',
    label: 'PDF Document',
    description: 'Export as PDF via print',
    icon: 'bxs-file-pdf',
  },
]

function handleSaveAction(id, toggleModal) {
  const serializer = window.__sceneSerializer
  if (!serializer) {
    console.warn('Scene serializer not initialized yet')
    return
  }

  switch (id) {
    case 'lixsketch': {
      const name = useUIStore.getState().workspaceName || 'Untitled'
      serializer.download(name)
      break
    }
    case 'pdf':
      serializer.exportPDF()
      break
  }

  toggleModal()
}

export default function SaveModal() {
  const saveModalOpen = useUIStore((s) => s.saveModalOpen)
  const toggleSaveModal = useUIStore((s) => s.toggleSaveModal)
  const workspaceName = useUIStore((s) => s.workspaceName)
  const setWorkspaceName = useUIStore((s) => s.setWorkspaceName)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)

  if (!saveModalOpen) return null

  const handleGenerateLink = async () => {
    let key = useUIStore.getState().sessionEncryptionKey
    if (!key) {
      key = await generateKey()
      useUIStore.getState().setSessionEncryptionKey(key)
    }
    const link = getShareableLink(key)
    setShareLink(link)
    setCopied(false)
  }

  const handleCopyLink = () => {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]"
      onClick={toggleSaveModal}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-surface-card border border-border-light rounded-2xl p-6 w-[380px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-text-primary text-base font-medium">Save & Share</h2>
          <button
            onClick={toggleSaveModal}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        {/* Workspace Name */}
        <div className="mb-4">
          <label className="text-text-dim text-xs uppercase tracking-wider mb-1.5 block">Workspace Name</label>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="e.g. cosmic-penguin"
            className="w-full bg-surface text-text-primary text-sm border border-border-light rounded-lg px-3 py-2 outline-none focus:border-accent-blue transition-all duration-200"
            spellCheck={false}
          />
        </div>

        {/* Share Link Section */}
        <div className="mb-4 p-3.5 rounded-xl border border-border-light bg-surface/50">
          <div className="flex items-center gap-2 mb-2.5">
            <i className="bx bx-link text-lg text-accent-blue" />
            <span className="text-text-primary text-sm font-medium">Shareable Link</span>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400/80">
              <i className="bx bxs-shield text-xs" />
              E2E Encrypted
            </span>
          </div>

          {shareLink ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-surface text-text-secondary text-xs border border-border-light rounded-lg px-2.5 py-2 outline-none truncate"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={handleCopyLink}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  copied
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-accent-blue hover:bg-accent-blue-hover text-text-primary'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateLink}
              className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-text-primary text-sm transition-all duration-200"
            >
              Generate Share Link
            </button>
          )}

          <p className="text-text-dim text-[10px] mt-2 leading-relaxed">
            The encryption key is stored in the URL fragment and never sent to the server.
          </p>
        </div>

        {/* Live Collaborate */}
        <div className="mb-4 p-3.5 rounded-xl border border-border-light bg-surface/50">
          <div className="flex items-center gap-2">
            <i className="bx bx-group text-lg text-accent-blue" />
            <div className="flex-1">
              <span className="text-text-primary text-sm font-medium">Live Collaborate</span>
              <p className="text-text-dim text-[10px] leading-relaxed">Real-time editing with up to 10 people</p>
            </div>
            <span className="text-text-dim text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue">Soon</span>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-border-light" />
          <span className="text-text-dim text-xs">Export</span>
          <div className="flex-1 h-px bg-border-light" />
        </div>

        {/* Save Options */}
        <div className="flex flex-col gap-2">
          {SAVE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSaveAction(option.id, toggleSaveModal)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border-light hover:border-accent-blue hover:bg-surface-hover cursor-pointer transition-all duration-200"
            >
              <i
                className={`bx ${option.icon} text-2xl text-accent-blue`}
              />
              <div className="flex flex-col items-start">
                <span className="text-text-primary text-sm">
                  {option.label}
                </span>
                <span className="text-text-dim text-xs">
                  {option.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
