export const metadata = {
  title: "Features",
  description: "What makes the Elixpo ecosystem unique — 100% open source, AI-powered, edge-first, and community-driven.",
  openGraph: {
    title: "Features | Elixpo",
    description: "What makes the Elixpo ecosystem unique.",
    images: ["/og-image.png"],
  },
};

const features = [
  {
    title: "100% Open Source",
    description: "Licensed under GNU GPL-3.0. Every line of code is transparent and open for contribution. All derivatives remain open.",
  },
  {
    title: "Completely Free",
    description: "All tools and platforms are free to use, forever. No paywalls, no premium tiers, no hidden costs.",
  },
  {
    title: "AI at the Core",
    description: "From art generation to intelligent search, AI powers the entire ecosystem through Pollinations API and custom models.",
  },
  {
    title: "Community-Driven",
    description: "35+ contributors from around the world. We welcome contributions and feature proposals from everyone.",
  },
  {
    title: "Interconnected Ecosystem",
    description: "Projects share authentication (SSO), infrastructure, and APIs. Build once, deploy everywhere.",
  },
  {
    title: "Edge-First Deployment",
    description: "Built on Cloudflare Workers, D1, and Pages for lightning-fast global performance at the edge.",
  },
  {
    title: "Modern Tech Stack",
    description: "Next.js 15, React 19, Tailwind CSS 4, Python, Redis, Firebase — using the best tools for each job.",
  },
  {
    title: "Developer Experience",
    description: "Well-documented, flexible tools built to be a joy to use. Empowering developers to build, test, and deploy with confidence.",
  },
  {
    title: "Hackathon Tested",
    description: "Battle-tested across 20+ hackathons. Built under pressure, refined with care, deployed with confidence.",
  },
];

export default function FeaturesPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Features</h1>
          <p className="text-lg text-muted">
            What makes the Elixpo ecosystem different.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl bg-white border border-border p-8 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
