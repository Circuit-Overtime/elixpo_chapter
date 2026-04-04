import teamData from "@/data/team.json";
import statsData from "@/data/stats.json";

export const metadata = {
  title: "About",
  description: "Learn about the mission, vision, and community behind Elixpo — a developer-first open-source ecosystem started in 2023.",
  openGraph: {
    title: "About | Elixpo",
    description: "The mission, vision, and community behind Elixpo.",
    images: ["/og-image.png"],
  },
};

export default function AboutPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Mission */}
        <div className="max-w-3xl mb-20">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">About Elixpo</h1>
          <p className="text-lg text-muted leading-relaxed mb-6">
            <strong>Enhanced Learning and Intelligence Process Optimization</strong> — Elixpo is a
            developer-first open-source ecosystem started in 2023 as a college initiative. In just
            two years, we have built over 13 projects, engaged a global community of 35+ contributors,
            and participated in 20+ hackathons.
          </p>
          <p className="text-lg text-muted leading-relaxed">
            Our mission is to build a future where AI is open, ethical, and accessible to everyone.
            We create community-driven tools where developers, creators, and enthusiasts can
            collaborate, learn, and innovate without barriers like paywalls or proprietary restrictions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {statsData.items.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white border border-border p-6 text-center">
              <p className="text-3xl font-bold text-accent">{item.value}</p>
              <p className="text-sm text-muted mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamData.values.map((value) => (
              <div key={value} className="rounded-2xl bg-white border border-border p-6">
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Programs */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Recognition & Programs</h2>
          <div className="flex flex-wrap gap-4">
            {teamData.programs.map((program) => (
              <div key={program.name} className="rounded-2xl bg-white border border-border px-6 py-4">
                <p className="font-semibold">{program.name}</p>
                <p className="text-sm text-muted">{program.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Founder */}
        <div>
          <h2 className="text-3xl font-bold mb-8">Founder</h2>
          <div className="inline-flex items-center gap-4 rounded-2xl bg-white border border-border px-8 py-6">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xl">
              A
            </div>
            <div>
              <p className="text-lg font-semibold">{teamData.founder.name}</p>
              <p className="text-sm text-muted">{teamData.founder.role}</p>
              <a
                href={`https://github.com/${teamData.founder.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                @{teamData.founder.github}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
