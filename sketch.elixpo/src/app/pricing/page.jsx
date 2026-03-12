'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import Link from 'next/link'

// ── Plan data ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Free',
    tagline: 'For personal sketches',
    monthlyPrice: 0,
    annualPrice: 0,
    color: '#4A90D9',
    glow: 'rgba(74, 144, 217, 0.08)',
    highlight: false,
    features: [
      '1 cloud workspace',
      'All shape & drawing tools',
      'PNG, SVG, PDF export',
      'LixScript diagrams',
      '10 AI requests / day',
      '5 MB image limit per room',
      '1 shared link at a time',
      'Community support',
    ],
    cta: 'Start Sketching',
    ctaHref: '/c/new',
  },
  {
    name: 'Pro',
    tagline: 'For power users & freelancers',
    monthlyPrice: 8,
    annualPrice: 6,
    color: '#8B88E8',
    glow: 'rgba(139, 136, 232, 0.12)',
    highlight: true,
    features: [
      'Everything in Free',
      'Up to 3 cloud workspaces',
      '50 AI requests / day',
      'Unlimited shared links',
      'Real-time collaboration (up to 10)',
      'Cloud auto-save & history',
      'Custom fonts & themes',
      'Priority support',
    ],
    cta: 'Get Pro',
    ctaHref: null,
  },
  {
    name: 'Team',
    tagline: 'For teams & organizations',
    monthlyPrice: 16,
    annualPrice: 12,
    color: '#D99BF0',
    glow: 'rgba(217, 155, 240, 0.08)',
    highlight: false,
    features: [
      'Everything in Pro',
      'Unlimited workspaces',
      'Unlimited AI requests',
      'Unlimited collaborators',
      'Team workspaces & permissions',
      'Admin dashboard & analytics',
      'SSO / SAML authentication',
      'Dedicated support & SLA',
    ],
    cta: 'Contact Us',
    ctaHref: null,
  },
]

// ── Dot grid background ──────────────────────────────────────────────────────

function DotGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" width="100%" height="100%">
      <defs>
        <pattern id="pricing-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.9" fill="rgba(139, 136, 232, 0.22)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pricing-dot-grid)" />
    </svg>
  )
}

// ── Floating margin doodles ──────────────────────────────────────────────────

function MarginDoodles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = async () => {
      const rough = (await import('roughjs')).default
      const w = window.innerWidth
      const h = document.documentElement.scrollHeight || 2000
      canvas.width = w * 2
      canvas.height = h * 2
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      const rc = rough.canvas(canvas)
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)

      const purple = { stroke: 'rgba(139,136,232,0.12)', strokeWidth: 1, roughness: 2 }
      const pink = { stroke: 'rgba(217,155,240,0.10)', strokeWidth: 1, roughness: 2 }
      const blue = { stroke: 'rgba(74,144,217,0.10)', strokeWidth: 1, roughness: 2 }

      // Scattered shapes around the margins
      rc.circle(60, 120, 35, purple)
      rc.rectangle(w - 90, 180, 45, 45, pink)
      rc.line(30, 340, 85, 375, blue)
      rc.circle(w - 55, 440, 24, purple)
      rc.rectangle(45, 580, 30, 30, pink)
      rc.line(w - 75, 680, w - 25, 710, blue)
      rc.circle(65, 820, 22, pink)
      rc.rectangle(w - 85, 920, 35, 35, purple)
      rc.line(45, 1060, 100, 1045, purple)
      rc.circle(w - 60, 1160, 28, blue)

      // Small crosses
      const cross = (cx, cy, s, o) => {
        rc.line(cx - s, cy, cx + s, cy, o)
        rc.line(cx, cy - s, cx, cy + s, o)
      }
      cross(w - 45, 130, 10, purple)
      cross(55, 470, 8, pink)
      cross(w - 55, 780, 9, blue)
      cross(80, 1000, 7, purple)
    }
    draw()
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

// ── Ambient glow orbs ────────────────────────────────────────────────────────

function AmbientGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Large hero glow behind cards */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[#8B88E8]/[0.06] blur-[150px]" />

      {/* Left purple blob */}
      <div className="absolute -top-20 -left-32 w-[600px] h-[600px] rounded-full bg-[#8B88E8]/[0.05] blur-[130px]" />

      {/* Right pink blob */}
      <div className="absolute top-[20%] -right-40 w-[500px] h-[500px] rounded-full bg-[#D99BF0]/[0.06] blur-[120px]" />

      {/* Mid-left blue accent */}
      <div className="absolute top-[45%] left-[5%] w-[400px] h-[400px] rounded-full bg-[#4A90D9]/[0.05] blur-[110px]" />

      {/* Bottom center warm glow */}
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/3 w-[700px] h-[350px] rounded-full bg-[#D99BF0]/[0.04] blur-[130px]" />

      {/* Small vivid accent blobs */}
      <div className="absolute top-[30%] left-[20%] w-[200px] h-[200px] rounded-full bg-[#8B88E8]/[0.08] blur-[80px]" />
      <div className="absolute top-[35%] right-[15%] w-[180px] h-[180px] rounded-full bg-[#4A90D9]/[0.07] blur-[70px]" />
      <div className="absolute bottom-[25%] right-[25%] w-[220px] h-[220px] rounded-full bg-[#D99BF0]/[0.06] blur-[80px]" />
    </div>
  )
}

// ── RoughJS card border ──────────────────────────────────────────────────────

function RoughCard({ children, color, highlight, glow, className = '' }) {
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
        strokeWidth: highlight ? 2 : 1.2,
        roughness: 1.2,
        bowing: 0.6,
        fill: highlight ? `${color}10` : 'transparent',
        fillStyle: 'solid',
      })

      // Corner marks on highlighted card
      if (highlight) {
        const m = 8
        const l = 14
        const cornerOpts = { stroke: color, strokeWidth: 1.5, roughness: 0.6 }
        // top-left
        rc.line(m, m, m + l, m, cornerOpts)
        rc.line(m, m, m, m + l, cornerOpts)
        // top-right
        rc.line(width - m, m, width - m - l, m, cornerOpts)
        rc.line(width - m, m, width - m, m + l, cornerOpts)
        // bottom-left
        rc.line(m, height - m, m + l, height - m, cornerOpts)
        rc.line(m, height - m, m, height - m - l, cornerOpts)
        // bottom-right
        rc.line(width - m, height - m, width - m - l, height - m, cornerOpts)
        rc.line(width - m, height - m, width - m, height - m - l, cornerOpts)
      }
    }

    raf = requestAnimationFrame(draw)
    const ro = new ResizeObserver(() => { raf = requestAnimationFrame(draw) })
    ro.observe(container)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [color, highlight])

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ boxShadow: highlight ? `0 0 60px ${glow}` : 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ── RoughJS underline ────────────────────────────────────────────────────────

function RoughUnderline({ width = 120, color = '#8B88E8' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = async () => {
      const rough = (await import('roughjs')).default
      canvas.width = width * 2
      canvas.height = 16
      canvas.style.width = width + 'px'
      canvas.style.height = '8px'
      const rc = rough.canvas(canvas)
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)
      rc.line(0, 4, width, 4, { stroke: color, strokeWidth: 1.5, roughness: 1.5 })
    }
    draw()
  }, [width, color])

  return <canvas ref={canvasRef} className="block mx-auto mt-1" />
}

// ── RoughJS toggle switch ────────────────────────────────────────────────────

function RoughToggle({ isAnnual, onToggle }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = async () => {
      const rough = (await import('roughjs')).default
      const w = 56
      const h = 28
      canvas.width = w * 2
      canvas.height = h * 2
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      const rc = rough.canvas(canvas)
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)
      ctx.clearRect(0, 0, w, h)

      rc.rectangle(2, 2, w - 4, h - 4, {
        stroke: '#8B88E8',
        strokeWidth: 1.2,
        roughness: 1,
        bowing: 0.5,
        fill: isAnnual ? '#8B88E820' : 'transparent',
        fillStyle: 'solid',
      })

      const knobX = isAnnual ? w - 16 : 16
      rc.circle(knobX, h / 2, 16, {
        stroke: '#8B88E8',
        strokeWidth: 1.5,
        roughness: 0.8,
        fill: '#8B88E8',
        fillStyle: 'solid',
      })
    }
    draw()
  }, [isAnnual])

  return (
    <canvas
      ref={canvasRef}
      className="cursor-pointer"
      onClick={onToggle}
    />
  )
}

// ── RoughJS checkmark bullet ─────────────────────────────────────────────────

function RoughCheck({ color }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = async () => {
      const rough = (await import('roughjs')).default
      canvas.width = 24
      canvas.height = 24
      canvas.style.width = '12px'
      canvas.style.height = '12px'
      const rc = rough.canvas(canvas)
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)
      rc.line(2, 6, 5, 10, { stroke: color, strokeWidth: 1.5, roughness: 0.5 })
      rc.line(5, 10, 10, 2, { stroke: color, strokeWidth: 1.5, roughness: 0.5 })
    }
    draw()
  }, [color])

  return <canvas ref={canvasRef} className="shrink-0 mt-0.5" />
}

// ── Animated price display ───────────────────────────────────────────────────

function AnimatedPrice({ price, color }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={price}
        initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="text-3xl font-medium text-text-primary font-[lixFont] inline-block"
      >
        {price === 0 ? 'Free' : `$${price}`}
      </motion.span>
    </AnimatePresence>
  )
}

// ── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, isAnnual, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
    >
      <RoughCard color={plan.color} highlight={plan.highlight} glow={plan.glow} className="h-full">
        <div className="p-6 flex flex-col h-full min-h-[440px]">
          {/* Badge */}
          {plan.highlight && (
            <motion.div
              className="mb-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: index * 0.15 + 0.3 }}
            >
              <span
                className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-medium"
                style={{ color: plan.color, backgroundColor: `${plan.color}18` }}
              >
                Most Popular
              </span>
            </motion.div>
          )}

          {/* Name & tagline */}
          <h3
            className="text-xl font-medium font-[lixFont]"
            style={{ color: plan.color }}
          >
            {plan.name}
          </h3>
          <p className="text-text-dim text-xs mt-1 mb-4">{plan.tagline}</p>

          {/* Price with animation */}
          <div className="mb-5">
            <div className="flex items-end gap-1">
              <AnimatedPrice price={price} color={plan.color} />
              {price > 0 && (
                <span className="text-text-dim text-xs mb-1">/ month</span>
              )}
            </div>
            <AnimatePresence mode="wait">
              {isAnnual && price > 0 && (
                <motion.p
                  key="annual-savings"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-[10px] mt-1"
                  style={{ color: plan.color }}
                >
                  Billed ${price * 12}/year — save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Features */}
          <ul className="flex flex-col gap-2.5 mb-6 flex-1">
            {plan.features.map((feature, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-2 text-text-secondary text-xs leading-relaxed"
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: index * 0.15 + 0.3 + i * 0.06 }}
              >
                <RoughCheck color={plan.color} />
                {feature}
              </motion.li>
            ))}
          </ul>

          {/* CTA */}
          {plan.ctaHref ? (
            <Link
              href={plan.ctaHref}
              className="block w-full text-center py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:brightness-110"
              style={{
                backgroundColor: plan.highlight ? plan.color : 'transparent',
                color: plan.highlight ? '#fff' : plan.color,
                border: plan.highlight ? 'none' : `1.5px solid ${plan.color}40`,
              }}
            >
              {plan.cta}
            </Link>
          ) : (
            <button
              disabled
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 opacity-60 cursor-not-allowed"
              style={{
                backgroundColor: plan.highlight ? plan.color : 'transparent',
                color: plan.highlight ? '#fff' : plan.color,
                border: plan.highlight ? 'none' : `1.5px solid ${plan.color}40`,
              }}
            >
              {plan.cta}
            </button>
          )}
        </div>
      </RoughCard>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true)
  const headerRef = useRef(null)
  const headerInView = useInView(headerRef, { once: true })

  return (
    <div className="relative min-h-screen bg-[#0a0a12] text-text-primary overflow-hidden">
      <DotGrid />
      <AmbientGlow />
      <MarginDoodles />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        {/* Header */}
        <motion.div
          ref={headerRef}
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
          animate={headerInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.6 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-dim text-xs hover:text-text-secondary transition-colors mb-8"
          >
            <i className="bx bx-arrow-back text-sm" />
            Back to home
          </Link>

          <h1 className="text-3xl md:text-4xl font-medium font-[lixFont] text-text-primary mb-3">
            Simple pricing
          </h1>
          <RoughUnderline width={160} color="#8B88E8" />
          <p className="text-text-dim text-sm mt-4 max-w-md mx-auto leading-relaxed">
            LixSketch is free and open source. Paid plans add collaboration, cloud storage, and team features.
          </p>

          {/* Alpha banner */}
          <motion.div
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/20 bg-amber-500/5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={headerInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <i className="bx bx-flask text-amber-400 text-sm" />
            <span className="text-amber-300/90 text-xs">
              Pricing is tentative — LixSketch is currently in <strong>alpha</strong>. All features are free during the preview.
            </span>
          </motion.div>

          {/* Monthly / Annual toggle */}
          <motion.div
            className="flex items-center justify-center gap-3 mt-8"
            initial={{ opacity: 0, y: 10 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <span className={`text-xs font-medium transition-all duration-300 ${!isAnnual ? 'text-text-primary' : 'text-text-dim'}`}>
              Monthly
            </span>
            <RoughToggle isAnnual={isAnnual} onToggle={() => setIsAnnual(!isAnnual)} />
            <span className={`text-xs font-medium transition-all duration-300 ${isAnnual ? 'text-text-primary' : 'text-text-dim'}`}>
              Annual
            </span>
            <AnimatePresence>
              {isAnnual && (
                <motion.span
                  initial={{ opacity: 0, x: -8, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.9 }}
                  transition={{ duration: 0.25, type: 'spring', stiffness: 300 }}
                  className="text-[10px] text-[#8B88E8] bg-[#8B88E8]/10 px-2 py-0.5 rounded-full font-medium"
                >
                  Save 25%
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} isAnnual={isAnnual} index={i} />
          ))}
        </div>

        {/* All plans include */}
        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-lg font-[lixFont] text-text-primary mb-2">All plans include</h2>
          <RoughUnderline width={140} color="#4A90D9" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8 max-w-3xl mx-auto">
            {[
              { icon: 'bx-pencil', label: 'All drawing tools', color: '#4A90D9' },
              { icon: 'bx-code-alt', label: 'LixScript DSL', color: '#8B88E8' },
              { icon: 'bx-export', label: 'PNG / SVG / PDF', color: '#D99BF0' },
              { icon: 'bx-lock-alt', label: 'E2E encryption', color: '#2ECC71' },
              { icon: 'bx-git-branch', label: 'Open source', color: '#4A90D9' },
              { icon: 'bx-palette', label: 'RoughJS aesthetic', color: '#E67E22' },
              { icon: 'bx-undo', label: 'Undo / redo', color: '#8B88E8' },
              { icon: 'bx-fullscreen', label: 'Infinite canvas', color: '#D99BF0' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center gap-2 text-text-secondary text-xs"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <i className={`bx ${item.icon} text-sm`} style={{ color: item.color }} />
                {item.label}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-text-dim text-xs mb-4">
            Questions? Want a custom plan? Reach out on{' '}
            <a
              href="https://github.com/elixpo/lixsketch/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B88E8] hover:underline"
            >
              GitHub Discussions
            </a>
          </p>
          <Link
            href="/c/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#8B88E8] hover:bg-[#7a77d6] text-white text-sm rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_rgba(139,136,232,0.3)]"
          >
            <i className="bx bx-pencil text-sm" />
            Start Sketching — It's Free
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
