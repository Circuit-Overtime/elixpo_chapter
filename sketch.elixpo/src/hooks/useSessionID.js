"use client"

import { useEffect } from 'react'
import useUIStore from '@/store/useUIStore'
import { generateWorkspaceName } from '@/utils/nameGenerator'

/**
 * Manages session ID in the URL and auto-generates workspace names.
 *
 * URL format: /c/<sessionID>#key=<encryptionKey>
 * - sessionID is the scene identifier (stored in pathname)
 * - key is the E2E encryption key (stored in fragment, never sent to server)
 *
 * On first load with no session ID, generates one and updates the URL.
 */
export default function useSessionID() {
  useEffect(() => {
    const path = window.location.pathname
    const segments = path.split('/').filter(Boolean)

    // Expect URL format: /c/<sessionId>
    let sessionID = null

    if (segments[0] === 'c' && segments[1]) {
      sessionID = segments[1]
    }

    if (!sessionID) {
      // For guests: try to reuse their saved workspace session ID
      const savedGuestSession = localStorage.getItem('lixsketch-guest-session')
      if (savedGuestSession) {
        sessionID = savedGuestSession
      } else {
        // Generate new session ID
        sessionID = `lx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        // Persist for guest reuse (guests get 1 workspace)
        localStorage.setItem('lixsketch-guest-session', sessionID)
      }
      const search = window.location.search
      const hash = window.location.hash
      window.history.replaceState(null, '', `/c/${sessionID}${search}${hash}`)
    } else {
      // If navigating to a specific session, update the guest session store
      localStorage.setItem('lixsketch-guest-session', sessionID)
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
  if (window.__sessionID) return window.__sessionID
  const segments = window.location.pathname.split('/').filter(Boolean)
  if (segments[0] === 'c' && segments[1]) return segments[1]
  return null
}

/**
 * Build a shareable link for the current session.
 * The encryption key goes in the fragment (#key=...) so the server never sees it.
 */
export function getShareableLink(encryptionKey) {
  const origin = window.location.origin
  const sessionID = getSessionID()
  if (encryptionKey) {
    return `${origin}/c/${sessionID}#key=${encryptionKey}`
  }
  return `${origin}/c/${sessionID}`
}
