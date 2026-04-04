import Link from "next/link";
import heroData from "@/data/hero.json";
import partnersData from "@/data/partners.json";
import GitHubStarButton from "@/components/GitHubStarButton";

export default function Hero() {
  const nodePositions = [
    "left-[8%] top-[20%]",
    "left-[25%] top-[5%]",
    "left-[18%] top-[60%]",
    "right-[25%] top-[5%]",
    "right-[8%] top-[20%]",
    "right-[18%] top-[60%]",
  ];

  return (
    <section className="relative overflow-hidden py-24 md:py-36">
      {/* Background dot pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }} />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Floating Nodes */}
        <div className="relative h-56 md:h-72 mb-8">
          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 280" fill="none" preserveAspectRatio="xMidYMid meet">
            <line x1="130" y1="80" x2="400" y2="140" stroke="#999" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="250" y1="40" x2="400" y2="140" stroke="#999" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="200" y1="200" x2="400" y2="140" stroke="#999" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="550" y1="40" x2="400" y2="140" stroke="#999" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="670" y1="80" x2="400" y2="140" stroke="#999" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="600" y1="200" x2="400" y2="140" stroke="#999" strokeWidth="1" strokeDasharray="6 4" />
          </svg>

          {/* Center Elixpo logo node */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <img
              src="/logo.png"
              alt="Elixpo"
              className="w-16 h-16 rounded-2xl shadow-xl shadow-accent/25"
            />
          </div>

          {/* Surrounding company logos */}
          {partnersData.partners.map((partner, i) => (
            <div
              key={partner.name}
              className={`absolute ${nodePositions[i]} ${i % 2 === 0 ? "animate-float-slow" : "animate-float-medium"} hidden md:block`}
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg border border-border/50">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="w-7 h-7"
                  title={partner.name}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Text Content */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            {heroData.headline}
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            {heroData.subheadline}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={heroData.primaryCta.href}
              className="px-8 py-3.5 rounded-full bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-accent/25"
            >
              {heroData.primaryCta.label}
            </Link>
            <GitHubStarButton className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-border text-foreground font-medium text-sm hover:bg-gray-50 transition-colors" />
          </div>
        </div>
      </div>
    </section>
  );
}
