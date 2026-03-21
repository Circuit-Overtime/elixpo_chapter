import Image from "next/image";
import teamData from "@/data/team.json";

export default function Team() {
  return (
    <section className="relative py-24 md:py-32 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            {teamData.headline}
          </h2>
          <p className="text-muted max-w-xl mx-auto text-base">
            {teamData.subheadline}
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {teamData.values.map((value) => (
            <div
              key={value}
              className="rounded-2xl bg-white border border-border p-5 text-center"
            >
              <p className="text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        {/* Programs & Recognition — 3x2 Pyramid */}
        <div className="mb-16">
          <h3 className="text-xl font-semibold text-center mb-8">
            Featured In & Supported By
          </h3>
          {/* Top row: 3 */}
          <div className="flex justify-center gap-4 mb-4">
            {teamData.programs.slice(0, 3).map((program) => (
              <div
                key={program.name}
                className="px-6 py-3 rounded-full bg-white border border-border text-center"
              >
                <span className="text-sm font-semibold">{program.name}</span>
                <span className="text-xs text-muted ml-2">{program.description}</span>
              </div>
            ))}
          </div>
          {/* Bottom row: 2 centered */}
          <div className="flex justify-center gap-4">
            {teamData.programs.slice(3).map((program) => (
              <div
                key={program.name}
                className="px-6 py-3 rounded-full bg-white border border-border text-center"
              >
                <span className="text-sm font-semibold">{program.name}</span>
                <span className="text-xs text-muted ml-2">{program.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Core Team */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {/* Founder */}
          <a
            href={`https://github.com/${teamData.founder.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 rounded-3xl bg-white border border-border px-8 py-6 hover:shadow-xl hover:border-accent/30 hover:-translate-y-1 transition-all duration-300 w-56"
          >
            <Image
              src={`https://github.com/${teamData.founder.github}.png`}
              alt={teamData.founder.name}
              width={72}
              height={72}
              className="w-18 h-18 rounded-full border-3 border-accent shadow-lg shadow-accent/20"
              unoptimized
            />
            <div className="text-center">
              <p className="font-bold text-base group-hover:text-accent transition-colors">{teamData.founder.name}</p>
              <p className="text-xs text-accent font-medium mt-0.5">{teamData.founder.role}</p>
              <p className="text-[11px] text-muted mt-1">@{teamData.founder.github}</p>
            </div>
          </a>

          {/* Core Team Members */}
          {teamData.coreTeam.map((member) => (
            <a
              key={member.github}
              href={`https://github.com/${member.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 rounded-3xl bg-white border border-border px-8 py-6 hover:shadow-xl hover:border-accent/30 hover:-translate-y-1 transition-all duration-300 w-56"
            >
              <Image
                src={`https://github.com/${member.github}.png`}
                alt={member.name}
                width={72}
                height={72}
                className="w-18 h-18 rounded-full border-2 border-border group-hover:border-accent shadow-md transition-colors"
                unoptimized
              />
              <div className="text-center">
                <p className="font-bold text-base group-hover:text-accent transition-colors">{member.name}</p>
                <p className="text-xs text-accent font-medium mt-0.5">{member.role}</p>
                <p className="text-[11px] text-muted mt-1">@{member.github}</p>
              </div>
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href={teamData.cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 rounded-full bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            {teamData.cta.label}
          </a>
        </div>
      </div>
    </section>
  );
}
