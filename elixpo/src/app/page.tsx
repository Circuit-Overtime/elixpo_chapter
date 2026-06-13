import { HeroSection } from "@/components/HeroSection";
import { AboutSection } from "@/components/AboutSection";
import { NominationSection } from "@/components/NominationSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { PackagesSection } from "@/components/PackagesSection";
import { NewsletterSection } from "@/components/NewsletterSection";
import { Contributors } from "@/components/Contributors";
import { FeatureProjectCTA } from "@/components/FeatureProjectCTA";

export const metadata = {
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Elixpo",
  url: "https://elixpo.com",
  logo: "/logos/logo.webp",
  description:
    "A developer-first open-source ecosystem of interconnected projects spanning AI art, intelligent search, collaborative sketching, and more.",
  founder: {
    "@type": "Person",
    name: "Ayushman Bhattacharya",
    url: "https://github.com/Circuit-Overtime",
  },
  sameAs: ["https://github.com/elixpo/elixpo_chapter"],
};

export default function Home() {
  return (
    <main className="bg-black text-[#E1E0CC]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <AboutSection />
      <NominationSection />
      <FeaturesSection />
      <PackagesSection />
      <NewsletterSection />
      <Contributors />
      <FeatureProjectCTA />
    </main>
  );
}
