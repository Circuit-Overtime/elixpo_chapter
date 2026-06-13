import { ProjectsGrid } from "@/components/ProjectsGrid";

export const metadata = {
  title: "Projects",
  description:
    "Explore the Elixpo ecosystem - interconnected open-source projects spanning AI, web, and developer tools.",
  alternates: { canonical: "/projects" },
  openGraph: {
    title: "Projects | Elixpo",
    description: "Interconnected open-source projects spanning AI, web, and developer tools.",
    images: ["/og-image.webp"],
  },
};

export default function ProjectsPage() {
  return (
    <section className="bg-black text-[#E1E0CC] pt-32 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen select-none">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 sm:mb-16">
          <span className="text-[10px] uppercase tracking-widest font-mono text-primary/80 block mb-3">
            The Elixpo Ecosystem
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif italic text-white tracking-tight">
            Projects
          </h1>
        </header>
        <ProjectsGrid />
      </div>
    </section>
  );
}
