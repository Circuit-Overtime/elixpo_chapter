'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import Link from 'next/link'

// ── Timeline data ─────────────────────────────────────────────────────────────
const SHIPPED = [
  {
    date: 'January 2026',
    title: 'Canvas Engine',
    status: 'shipped',
    color: '#4A90D9',
    items: [
      'Core RoughJS rendering engine',
      'Shape tools — rect, circle, line, freehand',
      'Text tool with font selection',
      'Zoom (0.4x–30x) & pan',
      'Undo/redo history stack',
      'Selection, drag, resize, rotate',
    ],
  },
  {
    date: 'February 2026',
    title: 'Power Tools',
    status: 'shipped',
    color: '#2ECC71',
    items: [
      'Smart arrow attachments with shape tracking',
      'Frame tool for artboard grouping',
      'Icon library — 250K+ searchable icons',
      'Code blocks with syntax highlighting',
      'Image tool with drag-and-drop',
      'Eraser & laser pointer',
    ],
  },
  {
    date: 'March 2026',
    title: 'Collaboration & Sharing',
    status: 'shipped',
    color: '#9B59B6',
    items: [
      'E2E encrypted sharing (AES-GCM 256-bit)',
      'Real-time collaboration via Durable Objects',
      'Live cursor sharing',
      'LixScript DSL with parser & preview',
      'AI diagram generation',
      'PNG & SVG export',
    ],
  },
]

const IN_PROGRESS = [
  {
    date: 'Q2 2026',
    title: 'Command Palette',
    status: 'in-progress',
    color: '#E67E22',
    items: [
      'Cmd+K / Ctrl+K keyboard interface',
      'Search tools, actions, recent canvases',
      'Keyboard-first workflow',
    ],
  },
  {
    date: 'Q2 2026',
    title: 'Properties Panel v2',
    status: 'in-progress',
    color: '#E67E22',
    items: [
      'Gradients & opacity controls',
      'Shadow & border-radius',
      'Pattern fills — hachure, dots, crosshatch',
    ],
  },
  {
    date: 'Q2 2026',
    title: 'Docs Integration',
    status: 'in-progress',
    color: '#E67E22',
    items: [
      'Embed live diagrams in documents',
      'Notion-like editor ↔ canvas bridge',
      'Inline LixScript previews in docs',
    ],
  },
]

const PLANNED = [
  {
    date: 'Q3 2026',
    title: 'Persistence & Accounts',
    status: 'planned',
    color: '#444480',
    items: [
      'Cloud save across sessions',
      'Optional user accounts',
      'Workspace dashboard',
      'Version history & restore',
    ],
  },
  {
    date: 'Q3 2026',
    title: 'Team Workspaces',
    status: 'planned',
    color: '#444480',
    items: [
      'Shared team canvases',
      'Role-based permissions',
      'Team component library',
      'Activity feed',
    ],
  },
  {
    date: 'Q4 2026',
    title: 'Advanced Canvas',
    status: 'planned',
    color: '#444480',
    items: [
      'Bezier connectors',
      'Tables on canvas',
      'Sticky notes',
      'Shape libraries (UI, AWS, flowchart)',
      'Canvas lock',
      'Nested frames',
    ],
  },
  {
    date: 'Q4 2026',
    title: 'Mobile & Integrations',
    status: 'planned',
    color: '#444480',
    items: [
      'Touch gestures & stylus',
      'Responsive toolbar',
      'GitHub embed integration',
      'VS Code extension',
      'Notion & Slack embeds',
    ],
  },
]

const ALL_ITEMS = [...SHIPPED, ...IN_PROGRESS, ...PLANNED]

// ── Dot grid background ───────────────────────────────────────────────────────
function DotGrid({ className }) {
  return (
    <svg className={className} width="100%" height="100%">
      <defs>
        <pattern id="roadmap-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.8" fill="rgba(91, 87, 209, 0.15)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#roadmap-dot-grid)" />
    </svg>
  )
}

// ── WebGL floating particles (very light, ambient) ────────────────────────────
function ParticleField({ className }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' })
    if (!gl) return

    let raf, mounted = true
    const dpr = Math.min(window.devicePixelRatio, 2)

    const VERT = `
      attribute vec2 aPos;
      attribute float aAlpha;
      uniform vec2 uRes;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec2 clip = (aPos / uRes) * 2.0 - 1.0;
        clip.y *= -1.0;
        gl_Position = vec4(clip, 0.0, 1.0);
        gl_PointSize = 2.0;
      }
    `
    const FRAG = `
      precision mediump float;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.4, d) * vAlpha;
        gl_FragColor = vec4(0.545, 0.533, 0.91, a);
      }
    `

    function createShader(type, src) {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)

    const COUNT = 50
    const particles = Array.from({ length: COUNT }, () => ({
      x: 0, y: 0,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.15,
      alpha: 0.15 + Math.random() * 0.35,
    }))

    const buf = gl.createBuffer()
    const data = new Float32Array(COUNT * 3)

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        if (p.x === 0) { p.x = Math.random() * w; p.y = Math.random() * h }
      })
    }
    resize()
    window.addEventListener('resize', resize)

    function frame() {
      if (!mounted) return
      const w = canvas.clientWidth, h = canvas.clientHeight

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        p.x = Math.max(0, Math.min(w, p.x))
        p.y = Math.max(0, Math.min(h, p.y))
      }

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

      for (let i = 0; i < COUNT; i++) {
        data[i * 3] = particles[i].x * dpr
        data[i * 3 + 1] = particles[i].y * dpr
        data[i * 3 + 2] = particles[i].alpha
      }

      gl.useProgram(prog)
      gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), canvas.width, canvas.height)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
      const posLoc = gl.getAttribLocation(prog, 'aPos')
      const alphaLoc = gl.getAttribLocation(prog, 'aAlpha')
      gl.enableVertexAttribArray(posLoc)
      gl.enableVertexAttribArray(alphaLoc)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 12, 0)
      gl.vertexAttribPointer(alphaLoc, 1, gl.FLOAT, false, 12, 8)
      gl.drawArrays(gl.POINTS, 0, COUNT)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => { mounted = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={ref} className={className} style={{ width: '100%', height: '100%' }} />
}

// ── RoughJS timeline node (circle on the spine) ──────────────────────────────
function TimelineNode({ color, status }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let mounted = true

    async function draw() {
      const rough = (await import('roughjs')).default
      if (!mounted) return

      const size = 28
      const dpr = window.devicePixelRatio || 1
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = size + 'px'
      canvas.style.height = size + 'px'

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      const rc = rough.canvas(canvas)

      if (status === 'shipped') {
        rc.circle(size / 2, size / 2, size - 4, {
          stroke: color, strokeWidth: 2, roughness: 1.5,
          fill: color, fillStyle: 'solid',
        })
        // Checkmark
        ctx.strokeStyle = '#0a0a12'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(9, 14)
        ctx.lineTo(12, 17)
        ctx.lineTo(19, 10)
        ctx.stroke()
      } else if (status === 'in-progress') {
        rc.circle(size / 2, size / 2, size - 4, {
          stroke: color, strokeWidth: 2, roughness: 1.8,
          fill: color + '30', fillStyle: 'solid',
        })
        // Pulsing inner dot drawn by CSS animation
      } else {
        rc.circle(size / 2, size / 2, size - 4, {
          stroke: color, strokeWidth: 1.5, roughness: 2,
        })
      }
    }

    draw()
    return () => { mounted = false }
  }, [color, status])

  return (
    <div className="relative">
      <canvas ref={canvasRef} />
      {status === 'in-progress' && (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
      )}
    </div>
  )
}

// ── RoughJS connector line between spine and card ─────────────────────────────
function RoughConnector({ side, color }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let mounted = true

    async function draw() {
      const rough = (await import('roughjs')).default
      if (!mounted) return

      const w = 40, h = 2
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = 4 * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = '4px'

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      const rc = rough.canvas(canvas)
      rc.line(0, 2, w, 2, {
        stroke: color, strokeWidth: 1.2, roughness: 1.5, bowing: 0.8,
      })
    }

    draw()
    return () => { mounted = false }
  }, [color, side])

  return <canvas ref={canvasRef} className="flex-shrink-0" />
}

// ── RoughJS card border ───────────────────────────────────────────────────────
function RoughCard({ children, color, className }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    let mounted = true

    async function draw() {
      const rough = (await import('roughjs')).default
      if (!mounted) return

      const dpr = window.devicePixelRatio || 1
      const w = container.offsetWidth
      const h = container.offsetHeight

      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)

      const rc = rough.canvas(canvas)
      rc.rectangle(3, 3, w - 6, h - 6, {
        stroke: color, strokeWidth: 1.3, roughness: 1.5, bowing: 0.8,
      })
    }

    const timer = setTimeout(draw, 60)
    return () => { mounted = false; clearTimeout(timer) }
  }, [color])

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ── RoughJS underline ─────────────────────────────────────────────────────────
function RoughUnderline({ width = 300, color = '#8B88E8' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let mounted = true

    async function draw() {
      const rough = (await import('roughjs')).default
      if (!mounted) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = 8 * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = '8px'

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      const rc = rough.canvas(canvas)
      rc.line(0, 4, width, 4, { stroke: color, strokeWidth: 1.5, roughness: 2, bowing: 1.2 })
    }

    draw()
    return () => { mounted = false }
  }, [width, color])

  return <canvas ref={canvasRef} className="block mt-2 mb-4" />
}

// ── RoughJS spine segment (vertical line between nodes) ───────────────────────
function SpineSegment({ height = 80, color = '#2a2a3a' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let mounted = true

    async function draw() {
      const rough = (await import('roughjs')).default
      if (!mounted) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = 4 * dpr
      canvas.height = height * dpr
      canvas.style.width = '4px'
      canvas.style.height = height + 'px'

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      const rc = rough.canvas(canvas)
      rc.line(2, 0, 2, height, { stroke: color, strokeWidth: 1.5, roughness: 1.2, bowing: 0.3 })
    }

    draw()
    return () => { mounted = false }
  }, [height, color])

  return <canvas ref={canvasRef} className="mx-auto" />
}

// ── Single timeline entry ─────────────────────────────────────────────────────
function TimelineEntry({ item, index, side }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const isLeft = side === 'left'

  return (
    <div ref={ref} className="relative">
      {/* Spine segment above (except first) */}
      {index > 0 && (
        <div className="flex justify-center mb-0">
          <SpineSegment height={48} color={item.status === 'planned' ? '#1e1e28' : '#2a2a3a'} />
        </div>
      )}

      <div className="flex items-center justify-center gap-0">
        {/* Left card (for even indices on desktop) */}
        <div className={`hidden md:flex flex-1 ${isLeft ? 'justify-end' : 'justify-end opacity-0 pointer-events-none'}`}>
          {isLeft && (
            <motion.div
              initial={{ opacity: 0, x: -40, filter: 'blur(8px)' }}
              animate={isInView ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-sm w-full"
            >
              <RoughCard color={item.color} className="p-5">
                <CardContent item={item} />
              </RoughCard>
            </motion.div>
          )}
        </div>

        {/* Connector left */}
        <div className={`hidden md:block ${isLeft ? '' : 'opacity-0'}`}>
          <RoughConnector side="left" color={item.color} />
        </div>

        {/* Node */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.05 }}
          className="flex-shrink-0 z-10"
        >
          <TimelineNode color={item.color} status={item.status} />
        </motion.div>

        {/* Connector right */}
        <div className={`hidden md:block ${!isLeft ? '' : 'opacity-0'}`}>
          <RoughConnector side="right" color={item.color} />
        </div>

        {/* Right card (for odd indices on desktop) */}
        <div className={`hidden md:flex flex-1 ${!isLeft ? 'justify-start' : 'justify-start opacity-0 pointer-events-none'}`}>
          {!isLeft && (
            <motion.div
              initial={{ opacity: 0, x: 40, filter: 'blur(8px)' }}
              animate={isInView ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-sm w-full"
            >
              <RoughCard color={item.color} className="p-5">
                <CardContent item={item} />
              </RoughCard>
            </motion.div>
          )}
        </div>

        {/* Mobile card (always right) */}
        <div className="md:hidden ml-4 flex-1">
          <motion.div
            initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
            animate={isInView ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <RoughCard color={item.color} className="p-4">
              <CardContent item={item} />
            </RoughCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// ── Card inner content ────────────────────────────────────────────────────────
function CardContent({ item }) {
  const statusLabel = {
    shipped: 'Shipped',
    'in-progress': 'In Progress',
    planned: 'Planned',
  }
  const statusColor = {
    shipped: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'in-progress': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    planned: 'bg-[#444480]/15 text-[#8B88E8] border-[#444480]/30',
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#6B6BA0] text-[11px] font-[lixFont] tracking-wide">{item.date}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-[lixFont] ${statusColor[item.status]}`}>
          {statusLabel[item.status]}
        </span>
      </div>
      <h3 className="text-white font-[lixFont] text-base mb-3">{item.title}</h3>
      <ul className="space-y-1.5">
        {item.items.map((text, i) => (
          <li key={i} className="flex items-start gap-2 text-[#c9d1d9] text-xs font-[lixFont] leading-relaxed">
            <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            {text}
          </li>
        ))}
      </ul>
    </>
  )
}

// ── Section divider with label ────────────────────────────────────────────────
function SectionDivider({ label, color, icon }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center gap-3 py-6"
    >
      <div className="h-px flex-1 max-w-20" style={{ backgroundColor: color + '30' }} />
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border font-[lixFont] text-xs" style={{ borderColor: color + '30', color }}>
        <i className={`bx ${icon} text-sm`} />
        {label}
      </div>
      <div className="h-px flex-1 max-w-20" style={{ backgroundColor: color + '30' }} />
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const { scrollYProgress } = useScroll()
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <div className="min-h-screen bg-[#121212] text-white font-[lixFont] relative">
      {/* Backgrounds */}
      <DotGrid className="fixed inset-0 pointer-events-none opacity-50" />
      <div className="fixed inset-0 pointer-events-none opacity-25">
        <ParticleField className="absolute inset-0" />
      </div>

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-[60] origin-left"
        style={{ width: progressWidth, background: 'linear-gradient(90deg, #4A90D9, #9B59B6, #E67E22)' }}
      />

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#121212]/90 backdrop-blur-xl border-b border-[#30363d]">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/Images/logo.png" alt="LixSketch" className="w-7 h-7" />
              <span className="text-white font-medium font-[lixFont]">LixSketch</span>
            </Link>
            <span className="text-[#444480]">/</span>
            <span className="text-[#a0a0b0] font-[lixFont]">Roadmap</span>
          </div>
          <Link href="/" className="text-[#a0a0b0] text-sm hover:text-white transition-colors font-[lixFont]">
            <i className="bx bx-arrow-back mr-1" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto pt-24 pb-20 px-6 relative z-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#8B88E8]/20 bg-[#8B88E8]/5 text-[#8B88E8] text-xs mb-6 font-[lixFont]">
            <i className="bx bx-map-alt" />
            Built in Public
          </div>
          <h1 className="text-4xl md:text-5xl font-[lixFont] text-white mb-3 leading-tight">Roadmap</h1>
          <RoughUnderline width={160} color="#8B88E8" />
          <p className="text-[#a0a0b0] text-base max-w-xl mx-auto font-[lixFont] leading-relaxed">
            What we've shipped, what we're building, and where we're headed.
          </p>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-8">
            {[
              { label: 'Shipped', color: '#2ECC71', filled: true },
              { label: 'In Progress', color: '#E67E22', filled: false },
              { label: 'Planned', color: '#444480', filled: false },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 text-xs font-[lixFont] text-[#a0a0b0]">
                <span
                  className="w-3 h-3 rounded-full border-2"
                  style={{
                    borderColor: l.color,
                    backgroundColor: l.filled ? l.color : 'transparent',
                  }}
                />
                {l.label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* ── Shipped ── */}
          <SectionDivider label="Shipped" color="#2ECC71" icon="bx-check-circle" />
          {SHIPPED.map((item, i) => (
            <TimelineEntry key={item.title} item={item} index={i} side={i % 2 === 0 ? 'left' : 'right'} />
          ))}

          {/* ── In Progress ── */}
          <SectionDivider label="In Progress" color="#E67E22" icon="bx-loader-circle" />
          {IN_PROGRESS.map((item, i) => (
            <TimelineEntry key={item.title} item={item} index={SHIPPED.length + i} side={(SHIPPED.length + i) % 2 === 0 ? 'left' : 'right'} />
          ))}

          {/* ── Planned ── */}
          <SectionDivider label="Planned" color="#8B88E8" icon="bx-time" />
          {PLANNED.map((item, i) => (
            <TimelineEntry key={item.title} item={item} index={SHIPPED.length + IN_PROGRESS.length + i} side={(SHIPPED.length + IN_PROGRESS.length + i) % 2 === 0 ? 'left' : 'right'} />
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mt-20"
        >
          <p className="text-[#6B6BA0] text-sm font-[lixFont] mb-4">
            Want to shape the roadmap? We're open source.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://github.com/elixpo/sketch.elixpo/issues/new?labels=enhancement"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg border border-[#8B88E8]/30 text-[#8B88E8] text-sm font-[lixFont] hover:bg-[#8B88E8]/10 transition-all flex items-center gap-2"
            >
              <i className="bx bx-bulb" />
              Request Feature
            </a>
            <a
              href="https://github.com/elixpo/sketch.elixpo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg bg-[#8B88E8] text-white text-sm font-[lixFont] hover:brightness-110 transition-all flex items-center gap-2"
            >
              <i className="bx bxl-github" />
              View on GitHub
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
