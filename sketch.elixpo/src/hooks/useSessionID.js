"use client"

import { useEffect } from 'react'
import useUIStore from '@/store/useUIStore'
import { generateWorkspaceName } from '@/utils/nameGenerator'

/**
 * Manages session ID in the URL and auto-generates workspace names.
 *
 * URL format: /<sessionID>#key=<encryptionKey>
 * - sessionID is the scene identifier (stored in pathname)
 * - key is the E2E encryption key (stored in fragment, never sent to server)
 *
 * On first load with no session ID, generates one and updates the URL.
 */
export default function useSessionID() {
  useEffect(() => {
    const path = window.location.pathname
    const segments = path.split('/').filter(Boolean)

    // Check if we already have a session ID in the URL
    let sessionID = segments[0] || null

    if (!sessionID) {
      // Generate new session ID
      sessionID = `lx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

      // Push to URL without reload — preserve query params and hash
      const search = window.location.search
      const hash = window.location.hash
      window.history.replaceState(null, '', `/${sessionID}${search}${hash}`)
    }

    // Store on window for the engine
    window.__sessionID = sessionID

    // Restore workspace name from localStorage, or generate on first visit
    const store = useUIStore.getState()
    const saved = localStorage.getItem('lixsketch-workspace-name')
    if (saved) {
      store.setWorkspaceName(saved)
    } else {
      store.setWorkspaceName(generateWorkspaceName())
    }
  }, [])
}

/**
 * Get the current session ID from the URL.
 */
export function getSessionID() {
  if (typeof window === 'undefined') return null
  return window.__sessionID || window.location.pathname.split('/').filter(Boolean)[0] || null
}

/**
 * Build a shareable link for the current session.
 * The encryption key goes in the fragment (#key=...) so the server never sees it.
 */
export function getShareableLink(encryptionKey) {
  const origin = window.location.origin
  const sessionID = getSessionID()
  if (encryptionKey) {
    return `${origin}/${sessionID}#key=${encryptionKey}`
  }
  return `${origin}/${sessionID}`
}
