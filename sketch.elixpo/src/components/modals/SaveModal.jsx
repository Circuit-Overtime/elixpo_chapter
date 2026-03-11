"use client"

import { useState } from 'react'
import useUIStore from '@/store/useUIStore'
import useAuthStore, { WORKER_URL } from '@/store/useAuthStore'
import { getSessionID } from '@/hooks/useSessionID'
import { useProfileStore } from '@/hooks/useGuestProfile'
import { generateKey, encrypt } from '@/utils/encryption'

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
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [permission, setPermission] = useState('view')

  // Live collab state
  const [collabLink, setCollabLink] = useState('')
  const [collabCopied, setCollabCopied] = useState(false)
  const [startingCollab, setStartingCollab] = useState(false)
  const [collabError, setCollabError] = useState('')

  if (!saveModalOpen) return null

  const handleGenerateLink = async () => {
    setSaving(true)
    setSaveError('')

    try {
      let key = useUIStore.getState().sessionEncryptionKey
      if (!key) {
        key = await generateKey()
        useUIStore.getState().setSessionEncryptionKey(key)
      }

      const serializer = window.__sceneSerializer
      if (!serializer) {
        setSaveError('Scene not ready')
        setSaving(false)
        return
      }

      const sceneData = serializer.save()
      const sceneJson = JSON.stringify(sceneData)
      const encryptedData = await encrypt(sceneJson, key)

      const sessionId = getSessionID()
      const profile = useProfileStore.getState().profile
      const authUser = useAuthStore.getState().user

      const res = await fetch(`${WORKER_URL}/api/scenes/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          encryptedData,
          permission,
          workspaceName: workspaceName || 'Untitled',
          createdBy: authUser?.id || profile?.id || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save')
      }

      const { token } = await res.json()

      const origin = window.location.origin
      const link = `${origin}/s/${token}#key=${key}`
      setShareLink(link)
      setCopied(false)
    } catch (err) {
      console.error('[SaveModal] Failed to save scene:', err)
      setSaveError(err.message || 'Failed to save scene')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = () => {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleStartCollab = async () => {
    setStartingCollab(true)
    setCollabError('')

    try {
      let key = useUIStore.getState().sessionEncryptionKey
      if (!key) {
        key = await generateKey()
        useUIStore.getState().setSessionEncryptionKey(key)
      }

      const sessionId = getSessionID()
      const profile = useProfileStore.getState().profile
      const authUser = useAuthStore.getState().user
      const userId = authUser?.id || profile?.id || sessionId
      const displayName = authUser?.displayName || profile?.displayName || 'Anonymous'

      // Room ID = session ID (one room per workspace)
      const roomId = sessionId
      const origin = window.location.origin
      const link = `${origin}/room/${roomId}#key=${key}`

      setCollabLink(link)
      setCollabCopied(false)
    } catch (err) {
      console.error('[SaveModal] Failed to start collab:', err)
      setCollabError(err.message || 'Failed to start collaboration')
    } finally {
      setStartingCollab(false)
    }
  }

  const handleCopyCollabLink = () => {
    if (!collabLink) return
    navigator.clipboard.writeText(collabLink).then(() => {
      setCollabCopied(true)
      setTimeout(() => setCollabCopied(false), 2000)
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
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-all duration-200"
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

          {/* Permission selector */}
          {!shareLink && (
            <div className="flex items-center gap-1.5 mb-2.5">
              {['view', 'edit'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPermission(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-200 ${
                    permission === p
                      ? 'bg-accent-blue/20 text-accent-blue'
                      : 'bg-surface text-text-muted hover:bg-surface-hover'
                  }`}
                >
                  {p === 'view' ? 'View only' : 'Can edit'}
                </button>
              ))}
            </div>
          )}

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
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
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
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-text-primary text-sm cursor-pointer transition-all duration-200 disabled:opacity-50"
            >
              {saving ? 'Saving to cloud...' : 'Generate Share Link'}
            </button>
          )}

          {saveError && (
            <p className="text-red-400 text-[10px] mt-2">{saveError}</p>
          )}

          <p className="text-text-dim text-[10px] mt-2 leading-relaxed">
            Scene is encrypted and saved to the cloud. The encryption key stays in the URL fragment and is never sent to the server.
          </p>
        </div>

        {/* Live Collaborate */}
        <div className="mb-4 p-3.5 rounded-xl border border-border-light bg-surface/50">
          <div className="flex items-center gap-2 mb-2.5">
            <i className="bx bx-group text-lg text-accent-blue" />
            <div className="flex-1">
              <span className="text-text-primary text-sm font-medium">Live Collaborate</span>
              <p className="text-text-dim text-[10px] leading-relaxed">Real-time E2E encrypted editing with up to 10 people</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-green-400/80">
              <i className="bx bxs-lock-alt text-xs" />
              Encrypted
            </span>
          </div>

          {collabLink ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={collabLink}
                readOnly
                className="flex-1 bg-surface text-text-secondary text-xs border border-border-light rounded-lg px-2.5 py-2 outline-none truncate"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={handleCopyCollabLink}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                  collabCopied
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-accent-blue hover:bg-accent-blue-hover text-text-primary'
                }`}
              >
                {collabCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartCollab}
              disabled={startingCollab}
              className="w-full py-2.5 rounded-lg bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue text-sm cursor-pointer transition-all duration-200 disabled:opacity-50"
            >
              {startingCollab ? 'Starting room...' : 'Start Live Session'}
            </button>
          )}

          {collabError && (
            <p className="text-red-400 text-[10px] mt-2">{collabError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
