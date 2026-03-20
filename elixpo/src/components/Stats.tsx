import statsData from "@/data/stats.json";

export default function Stats() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
          {statsData.headline}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {statsData.items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-4xl md:text-5xl font-bold tracking-tight text-accent">
                {item.value}
              </p>
              <p className="text-sm text-muted mt-2">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
