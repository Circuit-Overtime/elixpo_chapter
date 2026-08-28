import { getPortfolioPersons, getPersonContent } from "@/lib/content";
import LandingClient from "@/components/LandingClient";

export default function LandingPage() {
  const profiles = getPortfolioPersons().map((slug) => ({
    slug,
    ...getPersonContent(slug, "profile"),
  }));

  return <LandingClient profiles={profiles} />;
}
