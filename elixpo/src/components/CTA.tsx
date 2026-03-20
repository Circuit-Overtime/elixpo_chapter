import Link from "next/link";
import ctaData from "@/data/cta.json";

export default function CTA() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-5">
          {ctaData.headline}
        </h2>
        <p className="text-lg text-muted mb-10 max-w-xl mx-auto">
          {ctaData.subheadline}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={ctaData.primaryCta.href}
            className="px-8 py-3.5 rounded-full bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-accent/25"
          >
            {ctaData.primaryCta.label}
          </Link>
          <Link
            href={ctaData.secondaryCta.href}
            className="px-8 py-3.5 rounded-full border border-border text-foreground font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            {ctaData.secondaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
