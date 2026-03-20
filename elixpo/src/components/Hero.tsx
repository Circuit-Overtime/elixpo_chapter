import Link from "next/link";
import heroData from "@/data/hero.json";

function NodeIcon({ icon, color }: { icon: string; color: string }) {
  switch (icon) {
    case "lightbulb":
      return (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: color + "20" }}>
          <svg className="w-6 h-6" style={{ color }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
          </svg>
        </div>
      );
    case "checkmark":
      return (
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl" style={{ backgroundColor: color }}>
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "bolt":
      return (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: color + "20" }}>
          <svg className="w-5 h-5" style={{ color }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
          </svg>
        </div>
      );
    case "key":
      return (
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: color + "20" }}>
          <svg className="w-5 h-5" style={{ color }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
          </svg>
        </div>
      );
    case "quote":
      return (
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg bg-gray-100">
          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
          </svg>
        </div>
      );
    default:
      return null;
  }
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }} />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Connected Nodes Visual */}
        <div className="relative h-64 md:h-80 mb-12">
          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300" fill="none" preserveAspectRatio="xMidYMid meet">
            <line x1="150" y1="80" x2="300" y2="150" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="6 4" />
            <line x1="250" y1="60" x2="400" y2="130" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="6 4" />
            <line x1="400" y1="130" x2="550" y2="80" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="6 4" />
            <line x1="400" y1="130" x2="300" y2="200" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="6 4" />
            <line x1="550" y1="80" x2="650" y2="140" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="6 4" />
            <line x1="650" y1="140" x2="720" y2="120" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="6 4" />
          </svg>

          {/* Floating Nodes */}
          <div className="absolute left-[10%] top-[15%] animate-float-slow">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white shadow-lg flex items-center justify-center text-xs font-medium text-gray-500">
              AC
            </div>
          </div>

          <div className="absolute left-[25%] top-[5%] animate-float-medium">
            <NodeIcon icon="lightbulb" color="#FFC107" />
          </div>

          <div className="absolute left-[35%] top-[45%] animate-float-slow">
            <NodeIcon icon="key" color="#6366F1" />
          </div>

          {/* Center node - main */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <NodeIcon icon="checkmark" color="#7C3AED" />
          </div>

          <div className="absolute right-[30%] top-[10%] animate-float-medium">
            <NodeIcon icon="bolt" color="#10B981" />
          </div>

          <div className="absolute right-[15%] top-[35%] animate-float-slow">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white shadow-lg flex items-center justify-center text-xs font-medium text-gray-500">
              SK
            </div>
          </div>

          <div className="absolute right-[5%] top-[25%] animate-float-medium">
            <NodeIcon icon="quote" color="#1F2937" />
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            {heroData.headline.split(" ").map((word, i) => (
              <span key={i}>
                {word}{" "}
              </span>
            ))}
          </h1>
          <p className="text-lg text-muted max-w-xl mx-auto mb-10">
            {heroData.subheadline}
          </p>
          <Link
            href={heroData.cta.href}
            className="inline-block px-8 py-3.5 rounded-full bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
          >
            {heroData.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
