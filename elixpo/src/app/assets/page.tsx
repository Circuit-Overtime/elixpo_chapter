import { Download } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { VIDEOS } from "@/lib/media";
import { ELIXPO_LINKS } from "@/lib/elixpo-links";

export const metadata = {
  title: "Brand Assets",
  description:
    "Download the Elixpo brand kit - the Oreo mascot marks, the wordmark and lockup, per-service icons, and the brand palette. CC-BY-4.0 with the Oreo-trademark exception.",
  alternates: { canonical: "/assets" },
  openGraph: {
    title: "Brand Assets | Elixpo",
    description: "The Elixpo brand kit - marks, icons, and palette.",
    images: ["/og-image.webp"],
  },
};

const marks = [
  { name: "Mascot mark", file: "/brand/marks/mascot_elixpo_oreo.webp", note: "Oreo, the panda mascot" },
  { name: "Wordmark", file: "/brand/marks/elixpo_word_mask_text.webp", note: "The Elixpo wordmark" },
  { name: "Lockup", file: "/brand/marks/elixpo_lock_up_text_mascot.webp", note: "Mascot + wordmark lockup" },
  { name: "Site Partnership", file: "/brand/marks/elixpo_partnership_banner.webp", note: "Mascot + Wordmark Partnership"}
];

const icons = [
  "elixpo.com", "accounts.elixpo", "blogs.elixpo", "sketch.elixpo", "chat.elixpo",
  "art.elixpo", "me.elixpo", "oreo.elixpo", "url.elixpo",
  "mail.elixpo", "payouts.elixpo", "admin.elixpo", "agent.elixpo",
];

// Oreo brand palette (brand/MASCOT.md)
const palette = [
  { name: "BG", hex: "#FFF8EB" },
  { name: "Card", hex: "#FFF0D2" },
  { name: "Primary", hex: "#FF5D68" },
  { name: "Teal", hex: "#00B4A5" },
  { name: "Gold", hex: "#FFBE1E" },
  { name: "Orange", hex: "#FF8C1E" },
  { name: "Purple", hex: "#B450DC" },
  { name: "Green", hex: "#3CC864" },
  { name: "Text", hex: "#262630" },
  { name: "Muted", hex: "#A07864" },
];

export default function AssetsPage() {
  return (
    <div className="bg-black text-[#E1E0CC] select-none">
      <PageHero
        eyebrow="Brand Kit"
        title="Assets"
        subtitle="The Elixpo brand kit - Oreo, the wordmark and lockup, per-service icons, and the palette. Free to use under CC-BY-4.0 (mascot and names reserved)."
        video={VIDEOS.about}
      />

      <section className="max-w-7xl mx-auto px-6 py-20 space-y-20">
        {/* Brand marks */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white mb-2">
            Brand <span className="italic font-serif text-primary">marks</span>
          </h2>
          <p className="text-sm text-[#DEDBC8]/60 font-mono mb-8">The core identity. Click to download.</p>
          <div className="flex flex-wrap justify-center gap-5">
            {marks.map((m) => (
              <a
                key={m.file}
                href={m.file}
                download
                className="group rounded-2xl bg-[#141414] border border-white/10 p-6 hover:border-primary/30 transition-colors flex flex-col w-full sm:w-85"
              >
                <div className="aspect-video rounded-xl bg-[#0d0d0d] border border-white/5 flex items-center justify-center mb-4 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.file} alt={m.name} className="max-h-[80%] max-w-[80%] object-contain" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-[11px] text-[#DEDBC8]/50 font-mono">{m.note}</p>
                  </div>
                  <Download size={15} className="text-[#DEDBC8]/50 group-hover:text-primary transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Service icons */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white mb-2">
            Service <span className="italic font-serif text-primary">icons</span>
          </h2>
          <p className="text-sm text-[#DEDBC8]/60 font-mono mb-8">One icon per Elixpo service. Click to download.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {icons.map((name) => (
              <a
                key={name}
                href={`/brand/icons/${name}.webp`}
                download
                title={`Download ${name}`}
                className="group rounded-2xl bg-[#141414] border border-white/10 p-4 hover:border-primary/30 transition-colors flex flex-col items-center text-center gap-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/brand/icons/${name}.webp`}
                  alt={name}
                  className="w-16 h-16 object-contain rounded-xl"
                />
                <span className="text-[10px] font-mono text-[#DEDBC8]/60 group-hover:text-primary transition-colors truncate w-full">
                  {name}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Palette */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white mb-2">
            Brand <span className="italic font-serif text-primary">palette</span>
          </h2>
          <p className="text-sm text-[#DEDBC8]/60 font-mono mb-8">Oreo is a celebration brand: warm, bright, festive.</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {palette.map((c) => (
              <div key={c.name} className="rounded-2xl bg-[#141414] border border-white/10 overflow-hidden">
                <div className="h-20" style={{ backgroundColor: c.hex }} />
                <div className="p-3">
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-[11px] font-mono text-[#DEDBC8]/55 uppercase">{c.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guidelines */}
        <div className="rounded-2xl bg-[#141414] border border-white/10 p-8 text-center">
          <p className="text-sm text-[#DEDBC8]/70 leading-relaxed max-w-2xl mx-auto">
            These assets are licensed under <strong className="text-white">CC-BY-4.0</strong>.
            The Oreo mascot, the chest E-badge, and the &ldquo;Elixpo&rdquo; and
            &ldquo;Oreo&rdquo; names are reserved. Full rules live in the brand
            source of truth.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`${ELIXPO_LINKS.githubChapter.replace("elixpo_chapter", "elixpo")}/blob/main/brand/MASCOT.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-black text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Brand guidelines
            </a>
            <a
              href={`${ELIXPO_LINKS.githubChapter.replace("elixpo_chapter", "elixpo")}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-[#DEDBC8]/80 text-sm hover:text-white hover:border-white/25 transition-colors"
            >
              License
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
