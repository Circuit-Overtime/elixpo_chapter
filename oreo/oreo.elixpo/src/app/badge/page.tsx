"use client";

import { motion } from "framer-motion";
import { Reveal, fadeUp, staggerContainer } from "@/components/MotionWrap";
import BadgeMockup from "@/components/BadgeMockup";
import {
  Cpu, MemoryStick, Battery, Radio, Usb, Layers,
  Layout, Ruler, Github,
} from "lucide-react";

const SPECS = [
  { Icon: Cpu,          k: "MCU",      v: "ESP32-S3 dual core @ 240 MHz" },
  { Icon: MemoryStick,  k: "Memory",   v: "16 MB flash · 8 MB PSRAM" },
  { Icon: Radio,        k: "Radio",    v: "WiFi 2.4 GHz · BLE 5 · IR transceiver" },
  { Icon: Layout,       k: "Display",  v: "ST7789 240×320 IPS · portrait" },
  { Icon: Battery,      k: "Power",    v: "USB-C + LiPo deep-sleep · ~5 µA standby" },
  { Icon: Usb,          k: "I/O",      v: "8-button matrix · IMU · 1-wire IR · I²C bus" },
  { Icon: Ruler,        k: "Dimensions", v: "55 × 90 mm portrait PCB" },
  { Icon: Layers,       k: "Layers",   v: "4-layer FR-4 · 1.6 mm · ENIG finish" },
];

const STACK = [
  { lvl: "apps/",        body: "Userland — manifest.json + main.py per app.",
    tint: "from-primary/30 to-primary/5" },
  { lvl: "oreoOS/",      body: "The OS: launcher, store, OTA, notifications, file transfer.",
    tint: "from-lilac/30 to-lilac/5" },
  { lvl: "oreoWare/",    body: "HAL / Board Support: drivers for screen, buttons, IMU, BLE, WiFi, IR, battery.",
    tint: "from-teal/30 to-teal/5" },
  { lvl: "MicroPython",  body: "Runtime — we credit it loudly; we did not write it.",
    tint: "from-gold/30 to-gold/5" },
];

export default function BadgePage() {
  return (
    <div className="relative">
      {/* Soft brand glows */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden">
        <div className="absolute left-1/3 top-0  h-[440px] w-[440px] rounded-full bg-primary/[0.10] blur-[140px]" />
        <div className="absolute right-1/4 top-32 h-[300px] w-[300px] rounded-full bg-lilac/[0.10]  blur-[120px]" />
        <div className="absolute left-1/4 top-64  h-[260px] w-[260px] rounded-full bg-teal/[0.08]   blur-[120px]" />
      </div>

      <div className="container-page pt-16 pb-28">
        {/* ── HERO: copy left, mockup right ───────────────────────────── */}
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.span variants={fadeUp} className="chip mb-6">
              ESP32-S3-DevKitC · breadboard phase
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl"
            >
              The hardware,{" "}
              <span className="bg-gradient-to-r from-primary via-gold to-lilac
                               bg-clip-text text-transparent
                               drop-shadow-[0_0_30px_rgba(255,93,104,0.35)]">
                all open.
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-xl text-text-dim">
              Tufty-classic portrait layout. Eight buttons, IR for line-of-sight
              quests, an MPU6050 for shake and tilt, four LEDs around the frame.
              Schematics and BOM live on the repo — fork them and roll your own.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://github.com/elixpo/oreo/tree/main/docs/hardware"
                target="_blank" rel="noreferrer"
                className="btn-primary"
              >
                <Github className="h-4 w-4" /> Schematics + BOM
              </a>
              <a
                href="https://github.com/elixpo/oreo"
                target="_blank" rel="noreferrer"
                className="btn-ghost"
              >
                Repo
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <BadgeMockup />
          </motion.div>
        </div>

        {/* ── SCHEMATICS CALLOUT ──────────────────────────────────────── */}
        <Reveal>
          <div className="mt-16 rounded-lg border border-border bg-bg-raised/40 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center
                              rounded-md bg-card-sub text-gold">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl">Full schematics</h2>
                <p className="mt-1 text-sm text-text-dim">
                  KiCad project (4-layer FR-4, ENIG finish), Gerbers, and a
                  full BOM with substitutions live in <code className="text-text">docs/hardware/</code>.
                  PCB v1 fab files coming soon.
                </p>
                <span className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
                  Coming soon
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── SPEC GRID ────────────────────────────────────────────── */}
        <div className="mt-14 grid gap-3 sm:grid-cols-2">
          {SPECS.map((s, i) => (
            <motion.div
              key={s.k}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.04 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="card-surface flex items-start gap-3 p-5"
            >
              <div className="grid h-9 w-9 place-items-center rounded-md
                              bg-card-sub text-primary">
                <s.Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted">{s.k}</p>
                <p className="mt-1 text-text">{s.v}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── LAYERED ARCHITECTURE ────────────────────────────────── */}
        <Reveal>
          <div className="mt-16">
            <h2 className="font-display text-2xl tracking-tight">
              Layered architecture
            </h2>
            <p className="mt-2 text-text-dim">
              Four layers, each can be rewritten without the others noticing.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-3">
          {STACK.map((row, i) => (
            <motion.div
              key={row.lvl}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`relative overflow-hidden rounded-lg border border-border
                          bg-gradient-to-r ${row.tint} p-5`}
            >
              <div className="flex items-center justify-between gap-4">
                <code className="font-mono text-lg text-text">{row.lvl}</code>
                <span className="text-xs uppercase tracking-widest text-muted">
                  L{STACK.length - i}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text-dim">{row.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
