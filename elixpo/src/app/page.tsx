import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Projects from "@/components/Projects";
import Architecture from "@/components/Architecture";
import TechStack from "@/components/TechStack";
import Contributors from "@/components/Contributors";
import Team from "@/components/Team";
import CTA from "@/components/CTA";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Elixpo",
  url: "https://elixpo.com",
  logo: "/logo.png",
  description:
    "A developer-first open-source ecosystem of 13+ interconnected projects — AI art, intelligent search, collaborative sketching, and more.",
  founder: {
    "@type": "Person",
    name: "Ayushman Bhattacharya",
    url: "https://github.com/Circuit-Overtime",
  },
  sameAs: ["https://github.com/elixpo/elixpo_chapter"],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Stats />
      <Projects />
      <Architecture />
      <TechStack />
      <Contributors />
      <Team />
      <CTA />
    </>
  );
}
