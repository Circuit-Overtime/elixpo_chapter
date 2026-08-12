import Link from "next/link";
import { ArrowLeft, BookOpen, Building2, ExternalLink, GitBranch, Layers3, SearchX } from "lucide-react";

const destinations = [
  { href: "/", label: "Building", description: "Return to live agent operations", icon: Building2 },
  { href: "/floors", label: "Floors", description: "Browse operational domains", icon: Layers3 },
  { href: "/docs", label: "Framework docs", description: "Build on the OreoFlow runtime", icon: BookOpen },
];

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <div className="not-found-visual" aria-hidden="true">
          <span className="not-found-code">404</span>
          <div className="not-found-orbit orbit-one" />
          <div className="not-found-orbit orbit-two" />
          <div className="not-found-node"><SearchX size={29} /></div>
          <i className="not-found-packet packet-one" />
          <i className="not-found-packet packet-two" />
        </div>

        <div className="not-found-copy">
          <span className="not-found-eyebrow"><GitBranch size={14} /> Route not registered</span>
          <h1>This room does not exist.</h1>
          <p>The carrier reached the building, but no floor claims this address. Pick a known destination or return to operations.</p>
          <Link className="not-found-primary" href="/"><ArrowLeft size={15} /> Back to the building</Link>
        </div>
      </section>

      <section className="not-found-destinations" aria-label="Available destinations">
        {destinations.map(({ href, label, description, icon: Icon }) => (
          <Link href={href} key={href}>
            <span><Icon size={18} /></span>
            <strong>{label}</strong>
            <small>{description}</small>
          </Link>
        ))}
      </section>

      <a className="not-found-source" href="https://github.com/elixpo/agent.elixpo" target="_blank" rel="noreferrer">
        Check the source repository <ExternalLink size={13} />
      </a>
    </main>
  );
}
