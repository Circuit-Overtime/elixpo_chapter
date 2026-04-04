const technologies = [
  { name: "Next.js", color: "#000000" },
  { name: "React", color: "#61DAFB" },
  { name: "TypeScript", color: "#3178C6" },
  { name: "Python", color: "#3776AB" },
  { name: "Node.js", color: "#339933" },
  { name: "Firebase", color: "#FFCA28" },
  { name: "Cloudflare", color: "#F38020" },
  { name: "Redis", color: "#DC382D" },
  { name: "Tailwind CSS", color: "#06B6D4" },
  { name: "Docker", color: "#2496ED" },
  { name: "Kubernetes", color: "#326CE5" },
  { name: "Pollinations AI", color: "#8B5CF6" },
  { name: "Discord.js", color: "#5865F2" },
  { name: "Flask", color: "#000000" },
  { name: "WebSocket", color: "#010101" },
  { name: "GSAP", color: "#88CE02" },
];

export default function TechStack() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Powered by Modern Tech
          </h2>
          <p className="text-muted text-sm">
            The tools and technologies behind the Elixpo ecosystem.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {technologies.map((tech) => (
            <span
              key={tech.name}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border text-sm font-medium hover:shadow-md transition-shadow"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: tech.color }}
              />
              {tech.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
