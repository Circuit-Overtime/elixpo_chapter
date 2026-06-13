import {
  Code2, Gift, Sparkles, Users, Boxes, Zap, Layers, Terminal, Trophy,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { VIDEOS } from "@/lib/media";

export const metadata = {
  title: "Features",
  description:
    "What makes the Elixpo ecosystem unique: 100% open source, AI-powered, edge-first, and community-driven.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Features | Elixpo",
    description: "What makes the Elixpo ecosystem unique.",
    images: ["/og-image.webp"],
  },
};

const features = [
  {
    icon: Code2,
    title: "100% Open Source",
    description:
      "Code under MIT (with an Oreo-trademark exception) and assets under CC-BY-4.0. Every line is transparent and open for contribution.",
  },
  {
    icon: Gift,
    title: "Completely Free",
    description:
      "All tools and platforms are free to use, forever. No paywalls, no premium tiers, no hidden costs.",
  },
  {
    icon: Sparkles,
    title: "AI at the Core",
    description:
      "From art generation to intelligent search, AI powers the entire ecosystem through the Pollinations API and custom models.",
  },
  {
    icon: Users,
    title: "Community-Driven",
    description:
      "45+ contributors from around the world. We welcome contributions and feature proposals from everyone.",
  },
  {
    icon: Boxes,
    title: "Interconnected Ecosystem",
    description:
      "Projects share authentication (SSO), infrastructure, and APIs. Build once, deploy everywhere.",
  },
  {
    icon: Zap,
    title: "Edge-First Deployment",
    description:
      "Built on Cloudflare Workers, D1, and Pages for lightning-fast global performance at the edge.",
  },
  {
    icon: Layers,
    title: "Modern Tech Stack",
    description:
      "Next.js, React 19, Tailwind CSS 4, Python, Redis, and Firebase. The best tool for each job.",
  },
  {
    icon: Terminal,
    title: "Developer Experience",
    description:
      "Well-documented, flexible tools built to be a joy to use, so you can build, test, and ship with confidence.",
  },
  {
    icon: Trophy,
    title: "Hackathon Tested",
    description:
      "Battle-tested across 20+ hackathons. Built under pressure, refined with care, deployed with confidence.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-black text-[#E1E0CC] select-none">
      <PageHero
        eyebrow="Why Elixpo"
        title="Features"
        subtitle="A free, open, edge-first ecosystem of AI and developer tools, built in the open by a global community."
        video={VIDEOS.blogs}
      />

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl bg-[#141414] border border-white/10 p-7 overflow-hidden hover:border-primary/30 transition-colors duration-300 noise-overlay"
              >
                {/* Hover glow */}
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between mb-5">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary/15 transition-colors">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <span className="text-xs font-mono text-white/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="relative z-10 text-lg font-medium text-white mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="relative z-10 text-sm text-[#DEDBC8]/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
