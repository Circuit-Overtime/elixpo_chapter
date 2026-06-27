import {
  Network, ShieldCheck, Database, KeyRound, Globe, Rocket, Layers, Activity,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { VIDEOS } from "@/lib/media";

export const metadata = {
  title: "Architecture",
  description:
    "The Elixpo high-level design: Cloudflare DNS and edge gateway (Workers, Pages), Workers KV and D1 data, shared SSO/mail/payouts, the SaaS products and the lixrl flagship, plus ops dashboards.",
  alternates: { canonical: "/architecture" },
  openGraph: {
    title: "Architecture | Elixpo",
    description: "The Elixpo high-level design, edge-first on Cloudflare.",
    images: ["/og-image.webp"],
  },
};

const ARCH_CHART = `graph TD
  classDef edge fill:#1c1610,stroke:#F6821F,color:#F2D8BE,stroke-width:1.5px;
  classDef gw fill:#1d1d1d,stroke:#DEDBC8,color:#E1E0CC,stroke-width:1.5px;
  classDef data fill:#0f1a18,stroke:#00B4A5,color:#CDECE8,stroke-width:1.5px;
  classDef shared fill:#1d1d1d,stroke:#DEDBC8,color:#E1E0CC,stroke-width:1.5px;
  classDef saas fill:#141414,stroke:#9a9a9a,color:#E1E0CC;
  classDef flag fill:#2a2410,stroke:#FFBE1E,color:#ffffff,stroke-width:1.5px;
  classDef solo fill:#121a14,stroke:#3CC864,color:#D7ECDB;
  classDef ops fill:#1a1214,stroke:#FF5D68,color:#F3D4D8;

  USER([Users / Browsers]):::solo

  subgraph CF[" Cloudflare "]
    direction TB
    DNS["Cloudflare DNS<br/>*.elixpo.com routing"]:::edge
    GW["Edge Gateway<br/>Workers · Pages · WAF"]:::gw
    subgraph DATA["Data layer"]
      direction LR
      KV[("Workers KV<br/>sessions · cache")]:::data
      D1[("D1<br/>relational store")]:::data
    end
  end

  subgraph CORE["Identity &amp; shared services"]
    direction LR
    ACC["accounts.elixpo<br/>SSO / identity"]:::shared
    MAIL["mails.elixpo<br/>mail infra"]:::shared
    PAY["payouts.elixpo<br/>payments"]:::shared
  end

  subgraph SAAS["SaaS products · authenticated"]
    direction LR
    BLOGS["blogs.elixpo"]:::saas
    SKETCH["sketch.elixpo"]:::saas
    SEARCH["search.elixpo"]:::saas
    ART["art.elixpo · dev"]:::saas
    CHAT["chat.elixpo · dev"]:::saas
  end

  LIXRL["lixrl.com<br/>URL shortener · flagship"]:::flag

  subgraph SOLO["Standalone · no login"]
    direction LR
    HOME["elixpo.com"]:::solo
    OREO["oreo.elixpo"]:::solo
    ME["me.elixpo"]:::solo
  end

  subgraph OPS["Operations"]
    direction LR
    ADMIN["admin.elixpo<br/>dashboard"]:::ops
    STATUS["status.elixpo<br/>monitoring"]:::ops
  end

  USER --> DNS
  DNS --> GW
  GW --> ACC
  GW --> BLOGS & SKETCH & SEARCH & ART & CHAT
  GW --> LIXRL
  GW --> HOME & OREO & ME
  BLOGS & SKETCH & SEARCH & ART & CHAT & LIXRL --> ACC
  BLOGS & SKETCH & SEARCH & ART & CHAT & LIXRL --> MAIL
  BLOGS & SKETCH & SEARCH & ART & CHAT & LIXRL --> PAY
  ACC --> KV
  ACC --> D1
  MAIL --> D1
  PAY --> D1
  LIXRL --> KV
  ADMIN -.-> GW
  STATUS -.-> GW
`;

const layers = [
  {
    icon: Network,
    title: "Cloudflare DNS",
    text: "All *.elixpo.com hostnames resolve through Cloudflare DNS and route into the edge.",
  },
  {
    icon: ShieldCheck,
    title: "Edge gateway",
    text: "Cloudflare Workers + Pages (with WAF) serve SSR, APIs, and static assets at the edge.",
  },
  {
    icon: Database,
    title: "Data layer",
    text: "Workers KV holds sessions and cache; D1 is the relational store behind identity and services.",
  },
  {
    icon: KeyRound,
    title: "Identity & shared",
    text: "accounts.elixpo (SSO), mails.elixpo (mail), and payouts.elixpo (payments) back every product.",
  },
  {
    icon: Layers,
    title: "SaaS products",
    text: "Blogs, Sketch, Search, Art (dev) and Chat (dev) authenticate via SSO and share mail + payouts.",
  },
  {
    icon: Rocket,
    title: "Flagship",
    text: "lixrl.com, our URL shortener, uses all three shared services plus KV for hot lookups.",
  },
  {
    icon: Globe,
    title: "Standalone",
    text: "elixpo.com, oreo.elixpo and me.elixpo are public, login-free surfaces.",
  },
  {
    icon: Activity,
    title: "Operations",
    text: "admin.elixpo is the ops dashboard; status.elixpo monitors the platform.",
  },
];

export default function ArchitecturePage() {
  return (
    <div className="bg-black text-[#E1E0CC] select-none">
      <PageHero
        eyebrow="High-level design"
        title="Architecture"
        subtitle="Edge-first on Cloudflare: DNS into a Workers/Pages gateway, KV + D1 for data, shared SSO / mail / payouts behind every product."
        video={VIDEOS.sketch}
      />

      <section className="max-w-6xl mx-auto px-6 py-20">
        {/* Diagram - embedded frame */}
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e0e0e] to-[#080808] overflow-hidden mb-16 shadow-2xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02]">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#DEDBC8]/60">
              elixpo · system topology
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5D68]/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBE1E]/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#3CC864]/70" />
            </span>
          </div>
          <div className="p-4 sm:p-8 bg-[radial-gradient(circle_at_50%_0%,rgba(222,219,200,0.05),transparent_60%)]">
            <MermaidDiagram chart={ARCH_CHART} id="architecture" />
          </div>
        </div>

        {/* Legend / layers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {layers.map((l) => {
            const Icon = l.icon;
            return (
              <div key={l.title} className="rounded-2xl bg-[#141414] border border-white/10 p-6">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary w-fit mb-4">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-medium text-white mb-1.5">{l.title}</h3>
                <p className="text-xs text-[#DEDBC8]/65 leading-relaxed">{l.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
