'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import useAuthStore from '@/store/useAuthStore'
import { useProfileStore } from '@/hooks/useGuestProfile'
import { WORKER_URL } from '@/lib/env'

// ── Dot grid background ──────────────────────────────────────────────────────

function DotGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" width="100%" height="100%">
      <defs>
        <pattern id="profile-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.9" fill="rgba(74, 144, 217, 0.18)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#profile-dot-grid)" />
    </svg>
  )
}

// ── Ambient glow ─────────────────────────────────────────────────────────────

function AmbientGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-20 -left-32 w-[600px] h-[600px] rounded-full bg-[#4A90D9]/[0.05] blur-[130px]" />
      <div className="absolute top-[20%] -right-40 w-[500px] h-[500px] rounded-full bg-[#8B88E8]/[0.06] blur-[120px]" />
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/3 w-[700px] h-[350px] rounded-full bg-[#D99BF0]/[0.04] blur-[130px]" />
    </div>
  )
}

// ── RoughJS card ─────────────────────────────────────────────────────────────

function RoughCard({ children, color = '#4A90D9', className = '' }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let raf
    const draw = async () => {
      const rough = (await import('roughjs')).default
      const { width, height } = container.getBoundingClientRect()
      canvas.width = width * 2
      canvas.height = height * 2
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      const rc = rough.canvas(canvas)
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)
      ctx.clearRect(0, 0, width, height)

      rc.rectangle(4, 4, width - 8, height - 8, {
        stroke: color,
        strokeWidth: 1.2,
        roughness: 1.2,
        bowing: 0.6,
        fill: 'transparent',
        fillStyle: 'solid',
      })
    }

    raf = requestAnimationFrame(draw)
    const ro = new ResizeObserver(() => { raf = requestAnimationFrame(draw) })
    ro.observe(container)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [color])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function UsageBar({ used, limit, color = '#4A90D9', label, unit = '' }) {
  const pct = limit === 0 ? 0 : Math.min(100, (used / limit) * 100)
  const isNearLimit = pct >= 80

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-text-secondary text-xs">{label}</span>
        <span className={`text-xs font-mono ${isNearLimit ? 'text-red-400' : 'text-text-dim'}`}>
          {used}{unit} / {limit}{unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: isNearLimit ? '#EF4444' : color,
          }}
        />
      </div>
    </div>
  )
}

// ── Workspace card ───────────────────────────────────────────────────────────

function WorkspaceCard({ workspace, index, onDelete }) {
  const sizeKB = ((workspace.size_bytes || 0) / 1024).toFixed(1)
  const lastAccessed = workspace.last_accessed_at
    ? new Date(workspace.last_accessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never'
  const created = workspace.created_at
    ? new Date(workspace.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await onDelete(workspace)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <RoughCard color="#4A90D9">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-text-primary text-sm font-medium font-[lixFont] truncate">
              {workspace.workspace_name || 'Untitled'}
            </h3>
            <span className="text-text-dim text-[10px] bg-surface-hover px-2 py-0.5 rounded-full">
              {sizeKB} KB
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-text-dim">Created</span>
              <p className="text-text-secondary">{created}</p>
            </div>
            <div>
              <span className="text-text-dim">Last accessed</span>
              <p className="text-text-secondary">{lastAccessed}</p>
            </div>
            <div>
              <span className="text-text-dim">Views</span>
              <p className="text-text-secondary">{workspace.view_count || 0}</p>
            </div>
            <div>
              <span className="text-text-dim">Session</span>
              <p className="text-text-secondary font-mono truncate text-[10px]">{workspace.session_id?.slice(0, 12)}...</p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Link
              href={`/c/${workspace.session_id}`}
              className="flex-1 text-center py-1.5 rounded-lg text-xs text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/10 transition-all"
            >
              Open
            </Link>
            <button
              onClick={handleDelete}
              onMouseLeave={() => setConfirmDelete(false)}
              disabled={deleting}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                confirmDelete
                  ? 'text-red-400 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20'
                  : 'text-text-dim border border-white/10 hover:border-red-500/30 hover:text-red-400'
              } ${deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={confirmDelete ? 'Click again to confirm' : 'Delete workspace'}
            >
              {deleting ? (
                <i className="bx bx-loader-alt bx-spin text-sm" />
              ) : confirmDelete ? (
                <span className="text-[10px] font-medium">Confirm?</span>
              ) : (
                <i className="bx bx-trash text-sm" />
              )}
            </button>
          </div>
        </div>
      </RoughCard>
    </motion.div>
  )
}

// ── Tier badge ───────────────────────────────────────────────────────────────

const TIER_COLORS = {
  guest: { bg: 'bg-white/5', text: 'text-text-dim', border: 'border-white/10' },
  free: { bg: 'bg-[#4A90D9]/10', text: 'text-[#4A90D9]', border: 'border-[#4A90D9]/20' },
  pro: { bg: 'bg-[#8B88E8]/10', text: 'text-[#8B88E8]', border: 'border-[#8B88E8]/20' },
  team: { bg: 'bg-[#D99BF0]/10', text: 'text-[#D99BF0]', border: 'border-[#D99BF0]/20' },
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const init = useAuthStore((s) => s.init)

  const [quotaData, setQuotaData] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)

  const headerRef = useRef(null)
  const headerInView = useInView(headerRef, { once: true })

  // Generate a fresh session ID for the "New" workspace button
  const newSessionId = useMemo(
    () => `lx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    []
  )

  // Init auth on mount
  useEffect(() => { init() }, [init])

  // Fetch quota + workspaces
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (isAuthenticated && user?.id) {
          params.set('userId', user.id)
        } else {
          const profile = useProfileStore.getState().profile
          const guestId = profile?.id || localStorage.getItem('lixsketch-guest-session')
          if (guestId) params.set('guestId', guestId)
          else { setLoading(false); return }
        }

        const [quotaRes, wsRes] = await Promise.all([
          fetch(`${WORKER_URL}/api/user/quota-summary?${params}`),
          fetch(`${WORKER_URL}/api/scenes/list?${params}`),
        ])

        if (quotaRes.ok) {
          const q = await quotaRes.json()
          setQuotaData(q)
        }
        if (wsRes.ok) {
          const w = await wsRes.json()
          setWorkspaces(w.workspaces || [])
        }
      } catch (err) {
        console.warn('[Profile] Failed to fetch data:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [isAuthenticated, user?.id])

  const handleDeleteWorkspace = async (workspace) => {
    try {
      const profile = useProfileStore.getState().profile
      const createdBy = isAuthenticated && user?.id ? user.id : (profile?.id || localStorage.getItem('lixsketch-guest-session'))

      const res = await fetch(`${WORKER_URL}/api/scenes/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: workspace.session_id,
          createdBy,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete')
      }

      // Remove from local state
      setWorkspaces((prev) => prev.filter((ws) => ws.session_id !== workspace.session_id))
      // Update quota count
      if (quotaData) {
        setQuotaData((prev) => prev ? { ...prev, workspaceCount: Math.max(0, (prev.workspaceCount || 1) - 1) } : prev)
      }
    } catch (err) {
      console.error('[Profile] Failed to delete workspace:', err)
    }
  }

  const tier = quotaData?.tier || (isAuthenticated ? 'free' : 'guest')
  const tierStyle = TIER_COLORS[tier] || TIER_COLORS.guest

  // Current room image usage (from window global, set by imageTool)
  const roomImageUsed = typeof window !== 'undefined' ? (window.__roomImageBytesUsed || 0) : 0
  const roomImageLimitMB = 5

  return (
    <div className="relative min-h-screen bg-[#0a0a12] text-text-primary overflow-hidden">
      <DotGrid />
      <AmbientGlow />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        {/* Back link */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-text-dim text-xs hover:text-text-secondary transition-colors mb-8 bg-transparent border-none cursor-pointer"
          >
            <i className="bx bx-arrow-back text-sm" />
            Back
          </button>

          {/* Profile header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-accent-blue/20 flex items-center justify-center shrink-0">
              {isAuthenticated && user?.avatar ? (
                <img src={user.avatar} alt="" className="w-14 h-14 rounded-xl" referrerPolicy="no-referrer" />
              ) : (
                <i className="bx bx-user text-2xl text-accent-blue" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-medium font-[lixFont] text-text-primary truncate">
                  {isAuthenticated ? (user?.displayName || user?.email || 'User') : 'Guest'}
                </h1>
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium uppercase tracking-wider border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}>
                  {tier}
                </span>
              </div>
              {isAuthenticated && user?.email && (
                <p className="text-text-dim text-xs truncate">{user.email}</p>
              )}
              {!isAuthenticated && (
                <p className="text-text-dim text-xs">Sign in to unlock 3 workspaces and more AI requests</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg text-xs text-text-dim border border-white/10 hover:border-red-500/30 hover:text-red-400 transition-all"
                >
                  Sign out
                </button>
              ) : (
                <button
                  onClick={login}
                  className="px-4 py-1.5 rounded-lg text-xs text-white bg-accent-blue hover:bg-accent-blue/80 transition-all"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-accent-blue/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-blue animate-spin" />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Usage overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <RoughCard color="#8B88E8">
                <div className="p-5">
                  <h2 className="text-sm font-medium font-[lixFont] text-text-primary mb-4 flex items-center gap-2">
                    <i className="bx bx-bar-chart-alt-2 text-[#8B88E8]" />
                    Usage
                  </h2>

                  <UsageBar
                    label="AI Requests (today)"
                    used={quotaData?.ai?.used || 0}
                    limit={quotaData?.ai?.limit === 'unlimited' ? 999 : (quotaData?.ai?.limit || (isAuthenticated ? 10 : 5))}
                    color="#8B88E8"
                  />

                  <UsageBar
                    label="Workspaces"
                    used={workspaces.length}
                    limit={quotaData?.workspaces?.limit || (isAuthenticated ? 3 : 1)}
                    color="#4A90D9"
                  />

                  <UsageBar
                    label="Current Room Images"
                    used={parseFloat((roomImageUsed / (1024 * 1024)).toFixed(2))}
                    limit={roomImageLimitMB}
                    color="#2ECC71"
                    unit=" MB"
                  />

                  {tier !== 'pro' && tier !== 'team' && (
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1.5 mt-2 text-[#8B88E8] text-xs hover:underline"
                    >
                      <i className="bx bx-rocket text-sm" />
                      Upgrade for more
                    </Link>
                  )}
                </div>
              </RoughCard>
            </motion.div>

            {/* Workspaces */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium font-[lixFont] text-text-primary flex items-center gap-2">
                  <i className="bx bx-grid-alt text-[#4A90D9]" />
                  Workspaces
                  <span className="text-text-dim text-[10px] font-normal ml-1">
                    {workspaces.length} / {isAuthenticated ? 3 : 1}
                  </span>
                </h2>
                {workspaces.length < (isAuthenticated ? 3 : 1) && (
                  <Link
                    href={`/c/${newSessionId}?new=1`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/10 transition-all"
                  >
                    <i className="bx bx-plus text-sm" />
                    New
                  </Link>
                )}
              </div>

              {workspaces.length === 0 ? (
                <RoughCard color="#333">
                  <div className="p-8 text-center">
                    <i className="bx bx-folder-open text-3xl text-text-dim mb-2" />
                    <p className="text-text-dim text-sm mb-3">No workspaces yet</p>
                    <Link
                      href={`/c/${newSessionId}?new=1`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white text-xs rounded-lg transition-all"
                    >
                      <i className="bx bx-pencil text-sm" />
                      Start Sketching
                    </Link>
                  </div>
                </RoughCard>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {workspaces.map((ws, i) => (
                    <WorkspaceCard key={ws.id || ws.session_id} workspace={ws} index={i} onDelete={handleDeleteWorkspace} />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Account details for authenticated users */}
            {isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <RoughCard color="#555">
                  <div className="p-5">
                    <h2 className="text-sm font-medium font-[lixFont] text-text-primary mb-4 flex items-center gap-2">
                      <i className="bx bx-shield-alt-2 text-text-dim" />
                      Account
                    </h2>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-text-dim">Email</span>
                        <p className="text-text-secondary truncate">{user?.email || '—'}</p>
                      </div>
                      <div>
                        <span className="text-text-dim">Plan</span>
                        <p className="text-text-secondary capitalize">{tier}</p>
                      </div>
                      <div>
                        <span className="text-text-dim">Workspace limit</span>
                        <p className="text-text-secondary">
                          {tier === 'team' ? 'Unlimited' : tier === 'pro' ? '3' : '3 (free)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-dim">AI requests / day</span>
                        <p className="text-text-secondary">
                          {quotaData?.ai?.limit === 'unlimited' ? 'Unlimited' : (quotaData?.ai?.limit || 10)}
                        </p>
                      </div>
                    </div>
                  </div>
                </RoughCard>
              </motion.div>
            )}

            {/* Guest info card */}
            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <RoughCard color="#555">
                  <div className="p-5">
                    <h2 className="text-sm font-medium font-[lixFont] text-text-primary mb-3 flex items-center gap-2">
                      <i className="bx bx-info-circle text-text-dim" />
                      Guest Account
                    </h2>
                    <div className="space-y-2 text-xs text-text-dim">
                      <p>You're using LixSketch as a guest. Your workspace data is stored locally and synced to the cloud under a guest session.</p>
                      <ul className="space-y-1.5 mt-3">
                        <li className="flex items-center gap-2">
                          <i className="bx bx-check text-green-400" />
                          <span className="text-text-secondary">1 workspace</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <i className="bx bx-check text-green-400" />
                          <span className="text-text-secondary">5 AI requests / day</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <i className="bx bx-check text-green-400" />
                          <span className="text-text-secondary">5 MB image limit per room</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <i className="bx bx-x text-red-400" />
                          <span className="text-text-secondary">Unused workspaces deleted after 1 month</span>
                        </li>
                      </ul>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={login}
                          className="px-4 py-2 rounded-lg text-xs text-white bg-accent-blue hover:bg-accent-blue/80 transition-all"
                        >
                          Sign in for free
                        </button>
                        <Link
                          href="/pricing"
                          className="px-4 py-2 rounded-lg text-xs text-text-dim border border-white/10 hover:border-white/20 hover:text-text-secondary transition-all"
                        >
                          View plans
                        </Link>
                      </div>
                    </div>
                  </div>
                </RoughCard>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
