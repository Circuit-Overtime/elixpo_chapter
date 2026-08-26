import { getPortfolioPersons, getPersonContent } from "@/lib/content";
import LandingClient from "@/components/LandingClient";

export default function LandingPage() {
  const persons = getPortfolioPersons();
  const profiles = persons.map((p) => ({
    slug: p,
    ...getPersonContent(p, "profile"),
  }));

  return <LandingClient profiles={profiles} />;
}
