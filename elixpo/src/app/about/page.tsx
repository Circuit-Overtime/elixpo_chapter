import { Code2, Gift, Sparkles, Users, ArrowUpRight, Leaf, Rocket, GitFork, type LucideIcon } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { VIDEOS } from "@/lib/media";
import statsData from "@/data/stats.json";
import teamData from "@/data/team.json";

export const metadata = {
  title: "About",
  description:
    "The mission, vision, and people behind Elixpo, a developer-first open-source ecosystem started in 2023.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About | Elixpo",
    description: "The mission, vision, and community behind Elixpo.",
    images: ["/og-image.webp"],
  },
};

const TEAM_LEADS = [
  {
    name: "Ayushman Bhattacharya",
    role: "Founder & Lead",
    github: "Circuit-Overtime",
    img: "/members/Circuit-Overtime.webp",
  },
  {
    name: "Vivek Yadav",
    role: "Lead Co-Dev",
    github: "ez-vivek",
    img: "/members/ez-vivek.webp",
  },
  {
    name: "Anwesha Chakraborty",
    role: "Core Maintainer",
    github: "anwe-ch",
    img: "/members/anwe-ch.webp",
  },
];

const PROGRAM_ICONS: Record<string, LucideIcon> = {
  GSSOC: Code2,
  Hacktoberfest: Leaf,
  "Pollinations.AI": Sparkles,
  "MS Startup Foundations": Rocket,
  OSCI: GitFork,
};

const VALUES = [
  { icon: Code2, title: "Open Source", text: "Code under MIT and assets under CC-BY-4.0. Transparent and open for contribution." },
  { icon: Gift, title: "Completely Free", text: "Every tool and platform is free to use, forever. No paywalls, no premium tiers." },
  { icon: Sparkles, title: "AI-Powered", text: "Intelligence sits at the core, from art generation to intelligent search." },
  { icon: Users, title: "Community-Driven", text: "Built by 45+ contributors worldwide, welcoming creators of every background." },
];

export default function AboutPage() {
  return (
    <div className="bg-black text-[#E1E0CC] select-none">
      <PageHero
        eyebrow="Our Story"
        title="About Elixpo"
        subtitle="Enhanced Learning and Intelligence Process Optimization. A developer-first, open-source ecosystem started in 2023 as a college initiative."
        video={VIDEOS.about}
      />

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <span className="text-[10px] uppercase tracking-widest font-mono text-primary/80 block mb-4">
          The Mission
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white leading-tight mb-8">
          A future where AI is{" "}
          <span className="italic font-serif text-primary">open, ethical, and accessible</span> to everyone.
        </h2>
        <div className="space-y-5 text-base sm:text-lg text-[#DEDBC8]/75 leading-relaxed">
          <p>
            What began in 2023 as a college initiative has grown into a collaborative
            workspace with 45+ global contributors. In just two years we have built
            13+ projects and taken part in 20+ hackathons.
          </p>
          <p>
            We create community-driven tools where developers, creators, and enthusiasts
            can collaborate, learn, and innovate without barriers like paywalls or
            proprietary restrictions.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsData.items.map((item) => (
            <div key={item.label} className="rounded-2xl bg-[#141414] border border-white/10 p-6 text-center">
              <p className="text-3xl md:text-4xl font-light text-primary">{item.value}</p>
              <p className="text-xs text-[#DEDBC8]/60 font-mono uppercase tracking-wider mt-2">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team leads */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white mb-2">
          Team <span className="italic font-serif text-primary">Leads</span>
        </h2>
        <p className="text-sm text-[#DEDBC8]/60 font-mono mb-10">The core team steering the ecosystem.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TEAM_LEADS.map((member) => (
            <a
              key={member.github}
              href={`https://github.com/${member.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl bg-[#141414] border border-white/10 p-7 text-center hover:border-primary/30 transition-colors duration-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.img}
                alt={member.name}
                width={104}
                height={104}
                style={{ width: 104, height: 104, objectFit: "cover" }}
                className="rounded-full mx-auto mb-5 border-2 border-primary/30 group-hover:border-primary transition-colors"
              />
              <p className="text-lg font-medium text-white">{member.name}</p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-primary/80 mt-1 mb-3">
                {member.role}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-[#DEDBC8]/60 font-mono group-hover:text-primary transition-colors">
                @{member.github}
                <ArrowUpRight size={11} />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white mb-10">
          Our <span className="italic font-serif text-primary">Values</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="rounded-2xl bg-[#141414] border border-white/10 p-6">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary w-fit mb-4">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-medium text-white mb-1.5">{v.title}</h3>
                <p className="text-xs text-[#DEDBC8]/65 leading-relaxed">{v.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recognition & Programs */}
      <section className="max-w-7xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white mb-10">
          Recognition &amp; <span className="italic font-serif text-primary">Programs</span>
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {teamData.programs.map((program) => {
            const Icon = PROGRAM_ICONS[program.name] ?? Sparkles;
            return (
              <div
                key={program.name}
                className="rounded-2xl bg-[#141414] border border-white/10 px-6 py-5 w-[180px] flex flex-col items-center text-center gap-2.5 hover:border-primary/25 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <p className="font-medium text-white text-sm">{program.name}</p>
                <p className="text-[11px] text-[#DEDBC8]/55 font-mono leading-snug">{program.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
