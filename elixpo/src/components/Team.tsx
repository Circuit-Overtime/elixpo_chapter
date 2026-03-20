import Link from "next/link";
import teamData from "@/data/team.json";

export default function Team() {
  const positions = [
    "left-[2%] top-[10%] -rotate-6",
    "left-[8%] top-[50%] rotate-3",
    "left-[22%] top-[5%] rotate-2",
    "left-[20%] top-[55%] -rotate-3",
    "right-[22%] top-[5%] -rotate-2",
    "right-[20%] top-[55%] rotate-3",
    "right-[2%] top-[10%] rotate-6",
    "right-[8%] top-[50%] -rotate-3",
  ];

  return (
    <section className="relative py-24 md:py-32 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Scattered Team Photos */}
        <div className="relative h-[500px] md:h-[600px]">
          {teamData.members.map((member, index) => (
            <div
              key={member.name}
              className={`absolute ${positions[index]} hidden md:block`}
            >
              <div className="w-32 h-40 lg:w-40 lg:h-48 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 shadow-lg overflow-hidden border-2 border-white">
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium bg-gradient-to-br from-gray-100 to-gray-200">
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto mb-1 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs font-bold">
                      {member.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <p className="text-xs">{member.name.split(" ")[0]}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-8">
              <svg className="w-7 h-7 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>

            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              {teamData.headline}
            </h2>
            <p className="text-muted max-w-md mb-8 text-base">
              {teamData.subheadline}
            </p>
            <Link
              href={teamData.cta.href}
              className="inline-block px-8 py-3 rounded-full bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity"
            >
              {teamData.cta.label}
            </Link>
          </div>
        </div>

        {/* Mobile: show team as grid */}
        <div className="md:hidden grid grid-cols-2 gap-4 mt-8">
          {teamData.members.slice(0, 4).map((member) => (
            <div
              key={member.name}
              className="rounded-2xl bg-white shadow-md p-4 text-center"
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                {member.name.split(" ").map(n => n[0]).join("")}
              </div>
              <p className="text-sm font-medium">{member.name}</p>
              <p className="text-xs text-muted">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
