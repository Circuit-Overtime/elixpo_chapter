import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-20 py-16">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-3xl relative">
        {/* Subtle glow behind logo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, rgba(163,230,53,0.3) 0%, transparent 70%)" }} />

        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Elixpo Agent"
            width={80}
            height={80}
            className="rounded-2xl drop-shadow-lg"
            priority
          />
        </div>

        <h1
          className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-gradient-hero">Elixpo Agent</span>
        </h1>

        <p className="text-lg sm:text-xl text-[rgba(245,245,244,0.65)] max-w-2xl mx-auto leading-relaxed">
          Autonomous AI software engineering agent. Tag{" "}
          <code className="text-[#a3e635] text-sm font-mono bg-[rgba(163,230,53,0.1)] px-2 py-1 rounded-md border border-[rgba(163,230,53,0.2)]">
            @elixpoo
          </code>{" "}
          on any GitHub issue or PR, and the agent will analyze, plan, code, and
          ship a pull request.
        </p>

        <div className="flex gap-4 justify-center pt-2">
          <a href="/dashboard">
            <Button
              size="lg"
              className="bg-[#a3e635] text-[#0c0f0a] hover:bg-[#bef264] font-semibold px-6 rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:shadow-[0_0_30px_rgba(163,230,53,0.5)] transition-all"
            >
              Open Dashboard
            </Button>
          </a>
          <a
            href="https://github.com/elixpo/elixpoagent"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              variant="outline"
              className="border-white/15 text-[#f5f5f4] hover:bg-white/[0.08] hover:border-white/25 font-semibold px-6 rounded-xl transition-all"
            >
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-4 mr-1.5"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View on GitHub
            </Button>
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
        <FeatureCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-6 text-[#a3e635]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          }
          title="GitHub Integration"
          description="Tag @elixpoo on any issue or PR. The agent reads full context, plans a solution, writes code, and creates a PR automatically."
          accentColor="rgba(163, 230, 53, 0.15)"
        />
        <FeatureCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-6 text-[#86efac]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          }
          title="Stateful Sessions"
          description="Every interaction persists. Resume sessions, provide follow-ups, and the agent picks up exactly where it left off."
          accentColor="rgba(134, 239, 172, 0.15)"
        />
        <FeatureCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-6 text-[#fbbf24]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          }
          title="CLI + Web + API"
          description="Use from the terminal with `elixpo chat`, the web dashboard, or integrate directly via the REST API."
          accentColor="rgba(251, 191, 36, 0.15)"
        />
      </section>

      {/* Install & Quick Start */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-5xl">
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-xl bg-[rgba(163,230,53,0.1)] border border-[rgba(163,230,53,0.15)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5 text-[#a3e635]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Install CLI
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[rgba(245,245,244,0.4)] mb-1.5 font-medium uppercase tracking-wider">via pip</p>
              <pre className="bg-[rgba(255,255,255,0.04)] border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-mono text-[#a3e635]">
                pip install elixpo-cli
              </pre>
            </div>
            <div>
              <p className="text-xs text-[rgba(245,245,244,0.4)] mb-1.5 font-medium uppercase tracking-wider">via npm</p>
              <pre className="bg-[rgba(255,255,255,0.04)] border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-mono text-[#86efac]">
                npx elixpo-agent
              </pre>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-xl bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.15)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5 text-[#fbbf24]">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Quick Start
            </h3>
          </div>
          <pre className="bg-[rgba(255,255,255,0.04)] border border-white/[0.06] rounded-xl px-4 py-4 text-sm font-mono whitespace-pre-wrap leading-relaxed">
            <span className="text-[rgba(245,245,244,0.35)]"># Configure your API key</span>
{"\n"}<span className="text-[#f5f5f4]">elixpo config</span> <span className="text-[#a3e635]">--api-key</span> <span className="text-[#fbbf24]">sk-...</span>
{"\n"}
{"\n"}<span className="text-[rgba(245,245,244,0.35)]"># Start an interactive session</span>
{"\n"}<span className="text-[#f5f5f4]">elixpo chat</span>
{"\n"}
{"\n"}<span className="text-[rgba(245,245,244,0.35)]"># Or give a direct task</span>
{"\n"}<span className="text-[#f5f5f4]">elixpo chat</span> <span className="text-[#86efac]">"add input validation"</span>
          </pre>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full max-w-5xl space-y-10">
        <h2
          className="text-2xl font-bold text-center text-gradient-heading"
          style={{ fontFamily: "var(--font-display)" }}
        >
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[
            { step: "01", title: "Trigger", desc: "Tag @elixpoo on a GitHub issue, PR, or start a CLI session.", color: "#a3e635" },
            { step: "02", title: "Analyze", desc: "The agent loads repo context, reads files, understands the codebase.", color: "#86efac" },
            { step: "03", title: "Plan & Code", desc: "Creates a step-by-step plan, then writes and tests the code.", color: "#fbbf24" },
            { step: "04", title: "Ship", desc: "Opens a pull request with clean commits, ready for review.", color: "#c4b5fd" },
          ].map((item) => (
            <div key={item.step} className="glass-card rounded-2xl p-5 space-y-3 group hover:border-white/15 transition-all">
              <span
                className="text-3xl font-bold opacity-20"
                style={{ fontFamily: "var(--font-display)", color: item.color }}
              >
                {item.step}
              </span>
              <h3
                className="text-base font-semibold"
                style={{ fontFamily: "var(--font-display)", color: item.color }}
              >
                {item.title}
              </h3>
              <p className="text-sm text-[rgba(245,245,244,0.5)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-4 group hover:border-white/15 transition-all relative overflow-hidden">
      {/* Subtle accent glow */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none"
        style={{ background: accentColor }}
      />
      <div
        className="flex items-center justify-center size-10 rounded-xl border"
        style={{
          background: accentColor,
          borderColor: accentColor.replace("0.15", "0.2"),
        }}
      >
        {icon}
      </div>
      <h3
        className="text-base font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p className="text-sm text-[rgba(245,245,244,0.5)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
