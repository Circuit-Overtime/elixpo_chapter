import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Boxes, Code2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Technical documentation",
  description: "Developer guides and engineering deep dives for OreoOS and the Oreo Badge.",
};

const docs = [
  {
    href: "/docs/apps/",
    title: "Writing OreoOS apps",
    description: "App structure, lifecycle hooks, manifests, graphics, controls, and deployment.",
    icon: Code2,
    accent: "text-teal",
  },
  {
    href: "/docs/video-architecture/",
    title: "Gallery video architecture",
    description: "How RV565 v4, PSRAM frame blocks, native Xtensa code, and the display scheduler deliver 24 FPS video.",
    icon: Boxes,
    accent: "text-primary",
  },
];

export default function DocsPage() {
  return (
    <div className="container-page py-16 pb-28">
      <span className="chip mb-6"><BookOpen className="h-3.5 w-3.5" /> OreoOS docs</span>
      <h1 className="max-w-3xl font-display text-4xl tracking-tight sm:text-5xl">
        Build on the badge. Understand the system.
      </h1>
      <p className="mt-5 max-w-2xl text-text-dim">
        Practical developer references and detailed accounts of the engineering decisions behind OreoOS.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {docs.map((doc) => (
          <Link key={doc.href} href={doc.href} className="card-surface group p-7 hover:border-primary/50">
            <doc.icon className={`h-6 w-6 ${doc.accent}`} />
            <h2 className="mt-5 font-display text-2xl">{doc.title}</h2>
            <p className="mt-3 leading-relaxed text-text-dim">{doc.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm text-primary">
              Read documentation
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
