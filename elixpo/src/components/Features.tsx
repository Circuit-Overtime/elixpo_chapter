import featuresData from "@/data/features.json";

function CategoryIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "code":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    case "chart":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "palette":
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.2-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Features() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            {featuresData.headline}
          </h2>
          <p className="text-muted max-w-xl mx-auto text-base">
            {featuresData.subheadline}
          </p>
        </div>

        {/* Top Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {featuresData.categories.map((category) => (
            <div
              key={category.title}
              className="group rounded-3xl bg-white border border-border p-6 hover:shadow-lg transition-all duration-300"
            >
              {/* Placeholder image area */}
              <div className="h-40 rounded-2xl bg-gray-50 mb-5 flex items-center justify-center overflow-hidden">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow-md flex items-center justify-center mb-2 text-accent">
                    <CategoryIcon icon={category.icon} />
                  </div>
                  <p className="text-xs text-muted">Preview</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2">{category.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{category.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featuresData.highlights.map((highlight) => (
            <div
              key={highlight.title}
              className="group rounded-3xl bg-white border border-border p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="h-32 rounded-2xl bg-gray-50 mb-5 flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2">{highlight.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{highlight.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
