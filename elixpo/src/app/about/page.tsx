import teamData from "@/data/team.json";

export const metadata = {
  title: "About - Elixpo",
  description: "Learn about the team and mission behind Elixpo.",
};

export default function AboutPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-20">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">About Elixpo</h1>
          <p className="text-lg text-muted leading-relaxed">
            We are building the future of project orchestration. Our mission is to help teams
            of all sizes work more efficiently by providing a unified platform that connects
            every part of the development lifecycle.
          </p>
        </div>

        <div>
          <h2 className="text-3xl font-bold mb-10">Our Team</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {teamData.members.map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                  {member.name.split(" ").map(n => n[0]).join("")}
                </div>
                <p className="font-medium text-sm">{member.name}</p>
                <p className="text-xs text-muted">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
