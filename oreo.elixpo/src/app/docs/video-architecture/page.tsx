import Link from "next/link";
import {
  ArrowLeft, Binary, Box, Cpu, Gauge, Github, HardDrive,
  Layers3, MemoryStick, MonitorUp, Timer, Workflow,
} from "lucide-react";
import MermaidDiagram from "@/components/MermaidDiagram";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Gallery Video Architecture",
  description: "How OreoOS reaches 24 FPS Gallery playback with RV565 v4, PSRAM frame blocks, and a native Xtensa decoder.",
  path: "/docs/video-architecture/",
  keywords: ["ESP32 video playback", "MicroPython native module", "RGB565 video", "Xtensa decoder", "embedded video architecture"],
  type: "article",
});

const pipeline = String.raw`
flowchart LR
    subgraph Host[Host-side encoding]
        MP4[MP4 / MOV / WebM] --> FF[FFmpeg<br/>crop, scale, 24 FPS]
        FF --> RGB[180 × 135<br/>RGB888 frame]
        RGB --> Q[Median-cut quantizer<br/>256 colours per frame]
        Q --> PAL[512-byte<br/>RGB565 palette]
        Q --> IDX[24,300-byte<br/>index plane]
        PAL --> RV[RV565 v4]
        IDX --> RV
    end
    subgraph Badge[ESP32-S3 badge]
        RV --> LOAD[Incremental preload]
        LOAD --> BLOCKS[240 PSRAM<br/>frame blocks]
        BLOCKS --> C[Native xtensawin .mpy<br/>expand and scale]
        C --> FB[320 × 240<br/>RGB565 framebuffer]
        FB --> SPI[40 MHz SPI]
        SPI --> LCD[ST7789 LCD]
    end`;

const loading = String.raw`
flowchart TD
    OPEN[Open RV565 file] --> VALIDATE[Validate header and exact file size]
    VALIDATE --> LOOP{All 240 frames loaded?}
    LOOP -- No --> ALLOC[Allocate one 24,812-byte frame block]
    ALLOC --> READ[Read directly into block]
    READ --> APPEND[Append block to frame list]
    APPEND --> PROGRESS[Update loading percentage]
    PROGRESS --> INPUT[Return to OreoOS loop<br/>buttons remain responsive]
    INPUT --> LOOP
    LOOP -- Yes --> CLOSE[Close flash file]
    CLOSE --> PLAY[RAM-only playback]`;

const frameSequence = String.raw`
sequenceDiagram
    participant Loop as OreoOS loop
    participant Gallery
    participant Native as gallery_native.mpy
    participant FB as Display._buf
    participant LCD as ST7789
    Loop->>Gallery: update(dt)
    Gallery->>Gallery: select frame block
    Loop->>Gallery: draw(display)
    Gallery->>Native: indexed_scale_at(frame, 0, framebuffer, ...)
    Native->>FB: write 76,800 RGB565 pixels
    Native-->>Gallery: return (~5.2 ms)
    Loop->>LCD: display.present()
    LCD-->>Loop: full frame sent (~31 ms)`;

const playbackState = String.raw`
stateDiagram-v2
    [*] --> Loading
    Loading --> Loading: read three frame blocks / return to OS
    Loading --> Playing: all frames resident
    Playing --> Paused: A button
    Paused --> Playing: A button
    Playing --> Playing: 41.67 ms elapsed / advance once
    Playing --> Playing: late tick / discard excess delay
    Playing --> Loading: select another video
    Playing --> [*]: leave Gallery
    Paused --> [*]: leave Gallery`;

const toc = [
  ["budget", "The hardware budget"],
  ["iterations", "What failed first"],
  ["pipeline", "The final pipeline"],
  ["format", "RV565 v4 format"],
  ["memory", "Fragmentation-safe preload"],
  ["native", "Native code without new firmware"],
  ["timing", "Playback timing and controls"],
  ["deployment", "Deployment and compatibility"],
] as const;

const frameBudget = [
  { value: "41.67 ms", label: "24 FPS deadline", icon: Gauge },
  { value: "30.7 ms", label: "SPI transfer", icon: MonitorUp },
  { value: "≈11 ms", label: "compute headroom", icon: Cpu },
];

function SectionTitle({ id, icon: Icon, children }: {
  id: string;
  icon: typeof Cpu;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 pt-8">
      <div className="mb-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="font-display text-3xl tracking-tight text-text">{children}</h2>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-card-sub px-1.5 py-0.5 font-mono text-[0.92em] text-text">{children}</code>;
}

export default function VideoArchitecturePage() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
        <div className="absolute left-[12%] top-8 h-80 w-80 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute right-[10%] top-28 h-72 w-72 rounded-full bg-teal/10 blur-[130px]" />
      </div>

      <div className="container-page py-12 pb-28">
        <Link href="/docs/" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-text">
          <ArrowLeft className="h-4 w-4" /> All documentation
        </Link>

        <header className="mt-10 max-w-4xl">
          <span className="chip mb-6"><Cpu className="h-3.5 w-3.5" /> engineering deep dive</span>
          <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            From 0.5 FPS to native video.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-text-dim">
            Building responsive 24 FPS Gallery playback on an ESP32-S3 badge required more than a faster decoder. It meant redesigning the complete path from host encoding and flash storage to PSRAM, native Xtensa code, and the LCD bus.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs text-muted">
            <span className="chip">ESP32-S3</span><span className="chip">MicroPython 1.28</span>
            <span className="chip">RV565 v4</span><span className="chip">24 FPS</span>
            <span className="chip">320 × 240 RGB565</span>
          </div>
        </header>

        <div className="mt-14 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">On this page</p>
            <nav className="border-l border-border">
              {toc.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="block border-l border-transparent py-1.5 pl-4 text-sm text-text-dim transition-colors hover:border-primary hover:text-text">
                  {label}
                </a>
              ))}
            </nav>
            <a href="https://github.com/elixpo/oreo/blob/main/docs/VIDEO_ARCHITECTURE.md" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-xs text-muted hover:text-text">
              <Github className="h-3.5 w-3.5" /> Markdown source
            </a>
          </aside>

          <article className="min-w-0 max-w-4xl text-[15px] leading-7 text-text-dim">
            <p>
              Gallery video initially looked like an image-decoding problem. In practice, it became a systems problem involving storage bandwidth, interpreter overhead, PSRAM fragmentation, display timing, input latency, and safe deployment.
            </p>

            <SectionTitle id="budget" icon={Timer}>The hardware budget</SectionTitle>
            <p>The ST7789-compatible panel is connected over 40 MHz SPI. A full frame contains:</p>
            <pre className="my-5 overflow-x-auto rounded-lg border border-border bg-bg p-5 font-mono text-sm text-text">320 × 240 × 2 bytes = 153,600 bytes</pre>
            <p>
              That transfer consumes about 30.7 ms. A 24 FPS stream gets 41.67 ms per frame, leaving approximately 11 ms for frame selection, decoding, scaling, UI state, and input handling.
            </p>
            <div className="my-8 grid gap-4 sm:grid-cols-3">
              {frameBudget.map(({ value, label, icon: Icon }) => (
                <div key={label} className="card-surface p-5">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-display text-2xl text-text">{value}</p>
                  <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
                </div>
              ))}
            </div>

            <SectionTitle id="iterations" icon={Workflow}>What failed first</SectionTitle>
            <p>Each RV565 generation isolated a different bottleneck. “Native decode” alone was not enough; the entire data path had to fit inside the deadline.</p>
            <div className="my-7 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-card-sub text-xs uppercase tracking-wider text-muted"><tr><th className="p-4">Approach</th><th className="p-4">Measured cost</th><th className="p-4">Result</th></tr></thead>
                <tbody className="divide-y divide-border">
                  <tr><td className="p-4 text-text">Python nearest-neighbour scaling</td><td className="p-4">~367 ms/frame</td><td className="p-4">2–3 FPS before LCD output</td></tr>
                  <tr><td className="p-4 text-text">Persistent Deflate RGB565 stream</td><td className="p-4">~234 ms/frame</td><td className="p-4">Native inflate still missed budget</td></tr>
                  <tr><td className="p-4 text-text">Flash-read indexed frame + C scale</td><td className="p-4">~40 ms before LCD</td><td className="p-4">Filesystem bandwidth became limiting</td></tr>
                  <tr><td className="p-4 text-text">PSRAM indexed frame + C scale</td><td className="p-4">~5.2 ms</td><td className="p-4">Enough time remains for display output</td></tr>
                  <tr><td className="p-4 text-text">C scale + physical LCD transfer</td><td className="p-4">~39.0 ms</td><td className="p-4 text-teal">25.6 FPS measured ceiling</td></tr>
                </tbody>
              </table>
            </div>

            <SectionTitle id="pipeline" icon={Layers3}>The final pipeline</SectionTitle>
            <p>The workstation performs expensive colour analysis once. The badge executes only predictable operations: select, map, scale, and transfer.</p>
            <MermaidDiagram chart={pipeline} label="RV565 v4 from source video to physical pixels" />

            <SectionTitle id="format" icon={Binary}>RV565 v4 format</SectionTitle>
            <p>V4 retains the 12-byte RV565 header, followed by fixed-size independently addressable frames.</p>
            <div className="my-7 overflow-hidden rounded-lg border border-border bg-bg-raised">
              <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-6">
                {[["RV5", "Magic · 3 B"], ["4", "Version · 1 B"], ["180", "Width · LE16"], ["135", "Height · LE16"], ["24", "FPS · 1 B"], ["240", "Frames · LE16"]].map(([value, label]) => (
                  <div key={label} className="p-4 text-center"><p className="font-mono text-lg text-text">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-muted">{label}</p></div>
                ))}
              </div>
              <div className="grid border-t border-border md:grid-cols-[512fr_24300fr]">
                <div className="bg-primary/10 p-5"><p className="font-semibold text-text">RGB565 palette</p><p className="text-xs">256 colours · 512 bytes</p></div>
                <div className="bg-teal/10 p-5"><p className="font-semibold text-text">8-bit index plane</p><p className="text-xs">180 × 135 · 24,300 bytes</p></div>
              </div>
            </div>
            <pre className="my-5 overflow-x-auto rounded-lg border border-border bg-bg p-5 font-mono text-sm text-text">{`frame_size = 512 + (180 × 135) = 24,812 bytes
payload    = 24,812 × 240       = 5,954,880 bytes
file_size  = payload + 12       = 5,954,892 bytes`}</pre>
            <p>
              Every frame has an adaptive 256-colour palette. The 512-byte overhead provides materially better colour than a fixed RGB332 palette. Dithering stays disabled so palette changes do not make static regions shimmer.
            </p>

            <SectionTitle id="memory" icon={MemoryStick}>Fragmentation-safe preload</SectionTitle>
            <p>
              One 5.95 MB <Code>bytearray</Code> worked after reset but could fail after ordinary UI usage fragmented the heap. The final loader allocates 240 independent ~24 KB blocks, requiring only a small contiguous region for each allocation while preserving the same total data and quality.
            </p>
            <MermaidDiagram chart={loading} label="Incremental, input-friendly preload state machine" />
            <p>Three frames load per update. The launcher regains control between chunks, polls buttons, and redraws the progress indicator. Leaving Gallery releases the list and all frame blocks for garbage collection.</p>

            <SectionTitle id="native" icon={Cpu}>Native code without new firmware</SectionTitle>
            <p>
              The firmware does not expose <Code>micropython.viper</Code>, but its ABI advertises MicroPython MPY version 6, native sub-version 3, and <Code>xtensawin</Code>. Gallery can therefore ship a dynamically loaded native module at <Code>apps/gallery/src/gallery_native.mpy</Code> without rebuilding firmware.
            </p>
            <MermaidDiagram chart={frameSequence} label="One playback frame through the OreoOS application lifecycle" />
            <p>
              The C kernel builds nearest-neighbour X/Y lookup tables, reads one palette index per output pixel, and writes the matching 16-bit value directly into <Code>Display._buf</Code>. There is no 153 KB intermediate image. A second native function applies the same fast scaling path to Gallery photos.
            </p>

            <SectionTitle id="timing" icon={Gauge}>Playback timing and controls</SectionTitle>
            <p>Playback remains inside the normal OreoOS lifecycle. The launcher polls buttons before update and draw, so no second event loop or thread competes for input or display ownership.</p>
            <MermaidDiagram chart={playbackState} label="Gallery video states and input transitions" />
            <p>
              If a tick is late, Gallery advances at most one frame and discards excess accumulated delay. It never tries to catch up with a burst of work—the behaviour that previously froze controls. With native expansion plus LCD output at about 39 ms, input latency remains near one video frame.
            </p>

            <SectionTitle id="deployment" icon={HardDrive}>Deployment and compatibility</SectionTitle>
            <p>The deploy manifest includes Python and native MPY modules from app source trees, plus Gallery RV565 assets. A targeted replacement is:</p>
            <pre className="my-5 overflow-x-auto rounded-lg border border-border bg-bg p-5 font-mono text-sm text-text">python3 tools/deploy.py --override=gallery</pre>
            <p>
              The override removes the device-side Gallery tree before copying, preventing interrupted uploads from leaving partial media. Versions 1–3 remain readable for compatibility; V4 additionally requires the matching native module and validates its magic, dimensions, frame count, FPS, and exact payload size before playback.
            </p>

            <div className="mt-12 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-teal/10 p-7">
              <Box className="h-6 w-6 text-primary" />
              <h2 className="mt-4 font-display text-2xl text-text">Designed for this display, not every display.</h2>
              <p className="mt-3">
                RV565 v4 is intentionally not a general H.264 decoder. It optimizes for short 320 × 240 clips, predictable timing, responsive controls, good palette quality, and deployment without a custom firmware image. Its speed comes from assigning each job to the right resource: quantization on the host, storage in PSRAM, pixel loops in native Xtensa code, and control in MicroPython.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
