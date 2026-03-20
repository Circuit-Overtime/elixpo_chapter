import Link from "next/link";

export const metadata = {
  title: "Pricing - Elixpo",
  description: "Simple, transparent pricing for teams of all sizes.",
};

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "For individuals and small teams getting started.",
    features: ["Up to 5 projects", "Basic analytics", "Community support", "1GB storage"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For growing teams that need more power.",
    features: ["Unlimited projects", "Advanced analytics", "Priority support", "50GB storage", "Custom integrations", "Team roles"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with specific needs.",
    features: ["Everything in Pro", "Dedicated support", "Custom SLA", "Unlimited storage", "SSO & SAML", "Audit logs"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Pricing</h1>
          <p className="text-lg text-muted max-w-xl mx-auto">
            Simple, transparent pricing for teams of all sizes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl p-8 ${
                plan.highlighted
                  ? "bg-foreground text-white border-2 border-foreground shadow-2xl scale-105"
                  : "bg-white border border-border"
              }`}
            >
              <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className={plan.highlighted ? "text-gray-400" : "text-muted"}>
                    {plan.period}
                  </span>
                )}
              </div>
              <p className={`text-sm mb-6 ${plan.highlighted ? "text-gray-400" : "text-muted"}`}>
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <svg className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? "text-green-400" : "text-accent"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "Enterprise" ? "/contact" : "/signup"}
                className={`block text-center px-6 py-3 rounded-full font-medium text-sm transition-colors ${
                  plan.highlighted
                    ? "bg-white text-foreground hover:bg-gray-100"
                    : "bg-foreground text-white hover:opacity-90"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
