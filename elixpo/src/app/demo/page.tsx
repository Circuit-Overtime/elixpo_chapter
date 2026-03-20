export const metadata = {
  title: "Request a Demo - Elixpo",
  description: "Schedule a personalized demo of the Elixpo platform.",
};

export default function DemoPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Request a Demo</h1>
        <p className="text-lg text-muted mb-12">
          See how Elixpo can transform your project workflows. Fill out the form and we will get back to you shortly.
        </p>

        <form className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">First Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Work Email</label>
            <input
              type="email"
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="john@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Company</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="Acme Inc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
              placeholder="Tell us about your needs..."
            />
          </div>
          <button
            type="submit"
            className="px-8 py-3.5 rounded-full bg-accent text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Submit Request
          </button>
        </form>
      </div>
    </section>
  );
}
