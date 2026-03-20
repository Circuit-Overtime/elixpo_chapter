import Link from "next/link";

export const metadata = {
  title: "Products - Elixpo",
  description: "Explore Elixpo's suite of project orchestration tools.",
};

export default function ProductsPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Products</h1>
          <p className="text-lg text-muted mb-10">
            Explore our suite of tools designed to orchestrate every aspect of your projects.
          </p>
          <Link
            href="/demo"
            className="inline-block px-8 py-3.5 rounded-full bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Request a Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
