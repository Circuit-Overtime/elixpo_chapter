import featuresData from "@/data/features.json";

export const metadata = {
  title: "Features - Elixpo",
  description: "Discover all the features Elixpo offers for project orchestration.",
};

export default function FeaturesPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Features</h1>
          <p className="text-lg text-muted">
            Everything you need to orchestrate your projects in one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...featuresData.categories, ...featuresData.highlights].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl bg-white border border-border p-8 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
