"use client"

import { create } from 'zustand'
import { WORKER_URL } from '@/lib/env'

const STORAGE_KEY = 'lixsketch-auth'
const COOKIE_NAME = 'lixsketch-session'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days
const ELIXPO_AUTH_URL = 'https://accounts.elixpo.com'
const AUTH_RETURN_TO_KEY = 'lixsketch-auth-return-to'

function normalizeAuthReturnTo(value) {
  if (typeof window === 'undefined' || !value) return null
  try {
    const target = new URL(value, window.location.origin)
    if (target.origin !== window.location.origin) return null
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return null
  }
}

export function consumeAuthReturnTo() {
  if (typeof window === 'undefined') return null
  try {
    const returnTo = normalizeAuthReturnTo(sessionStorage.getItem(AUTH_RETURN_TO_KEY))
    sessionStorage.removeItem(AUTH_RETURN_TO_KEY)
    return returnTo
  } catch {
    return null
  }
}

function loadAuth() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
    if (match) return JSON.parse(decodeURIComponent(match[1]))
  } catch {}
  return null
}

function saveAuth(data) {
  if (typeof window === 'undefined') return
  try {
    if (data) {
      const json = JSON.stringify(data)
      localStorage.setItem(STORAGE_KEY, json)
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(json)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
    } else {
      localStorage.removeItem(STORAGE_KEY)
      document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
    }
  } catch {}
}

const useAuthStore = create((set, get) => ({
  user: null,
  sessionToken: null,
  isAuthenticated: false,
  activeRooms: 0,
  maxRooms: 1,
  loading: false,

  init: () => {
    const saved = loadAuth()
    if (saved?.sessionToken && saved?.user) {
      console.log('[Auth] Restored session:', saved.user.displayName || saved.user.email)
      set({
        user: saved.user,
        sessionToken: saved.sessionToken,
        isAuthenticated: true,
      })
    }
  },

  login: (returnTo) => {
    const clientId = process.env.NEXT_PUBLIC_ELIXPO_AUTH_CLIENT_ID
    if (!clientId) {
      console.error('[Auth] Missing NEXT_PUBLIC_ELIXPO_AUTH_CLIENT_ID')
      return
    }
    const appOrigin = window.location.origin
    const redirectUri = `${appOrigin}/api/auth/callback`
    const state = crypto.randomUUID()

    sessionStorage.setItem('lixsketch-oauth-state', state)

    const authReturnTo = normalizeAuthReturnTo(
      returnTo || `${window.location.pathname}${window.location.search}${window.location.hash}`,
    )
    try {
      if (authReturnTo && authReturnTo !== '/') {
        sessionStorage.setItem(AUTH_RETURN_TO_KEY, authReturnTo)
      } else {
        sessionStorage.removeItem(AUTH_RETURN_TO_KEY)
      }
    } catch {}

    const authUrl = `${ELIXPO_AUTH_URL}/oauth/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=openid profile email`

    console.log('[Auth] Redirecting to Elixpo SSO...', { redirectUri })
    window.location.href = authUrl
  },

  handleCallback: async (sessionToken, user) => {
    console.log('[Auth] Saving session for:', user.displayName || user.email)
    saveAuth({ sessionToken, user })
    set({
      user,
      sessionToken,
      isAuthenticated: true,
    })
  },

  updateUser: (patch) => {
    const current = get().user
    if (!current) return
    const user = { ...current, ...patch }
    set({ user })
    saveAuth({ sessionToken: get().sessionToken, user })
  },

  // Validate session by hitting Elixpo /api/auth/me with the access token
  fetchMe: async () => {
    const token = get().sessionToken
    if (!token) return

    try {
      const res = await fetch(`${ELIXPO_AUTH_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        console.warn('[Auth] Session expired or invalid, logging out')
        get().logout()
        return
      }

      const profile = await res.json()
      const user = {
        id: profile.id || profile.userId,
        email: profile.email,
        displayName: profile.displayName,
        avatar: profile.avatar || null,
        isAdmin: profile.isAdmin || false,
        tier: profile.tier || get().user?.tier || 'free',
      }
      set({ user, isAuthenticated: true })
      saveAuth({ sessionToken: token, user })
    } catch {
      // Network error — keep existing state
    }
  },

  logout: () => {
    console.log('[Auth] Signing out')
    saveAuth(null)
    set({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      activeRooms: 0,
    })
  },
}))

export default useAuthStore
export { WORKER_URL }
