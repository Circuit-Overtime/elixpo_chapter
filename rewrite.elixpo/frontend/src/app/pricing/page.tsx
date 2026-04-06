"use client";

import { startLogin } from "@/lib/auth";
import { isLoggedIn } from "@/lib/api";
import { useEffect, useState } from "react";

const plans = [
  {
    name: "Guest",
    price: "Free",
    period: "",
    features: [
      "2 AI checks per day",
      "Full detection report",
      "Per-paragraph scoring",
      "No sign-up required",
    ],
    limits: [
      "No paraphrasing",
      "No file upload",
      "No history",
    ],
    cta: null,
    highlight: false,
  },
  {
    name: "Free",
    price: "Free",
    period: "forever",
    features: [
      "10 AI checks per day",
      "2 rewrites per day",
      "File upload (PDF, DOCX, .tex)",
      "Full detection report",
      "Session history",
      "Resume interrupted jobs",
    ],
    limits: [
      "Max 5,000 words per check",
    ],
    cta: "sign_in",
    highlight: true,
  },
  {
    name: "Pro",
    price: "TBD",
    period: "/month",
    features: [
      "Unlimited AI checks",
      "Unlimited rewrites",
      "Priority processing",
      "Up to 25,000 words",
      "API access",
      "Bulk file processing",
      "Download rewritten .tex",
    ],
    limits: [],
    cta: "coming_soon",
    highlight: false,
  },
];

export default function PricingPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => { setLoggedIn(isLoggedIn()); }, []);

  return (
    <div className="space-y-8 pt-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold font-display text-gradient">
          Pricing
        </h1>
        <p className="text-text-muted text-sm">
          Generous free tier for students. Sign in to unlock paraphrasing.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`glass-card p-6 flex flex-col ${
              plan.highlight ? "border-lime-border" : ""
            }`}
          >
            {plan.highlight && (
              <span className="text-[10px] font-semibold text-lime bg-lime-dim px-2 py-0.5 rounded-full self-start mb-3 border border-lime-border">
                Recommended
              </span>
            )}
            <h2 className="text-lg font-bold font-display text-text-primary">
              {plan.name}
            </h2>
            <div className="mt-2 mb-4">
              <span className="text-2xl font-bold text-text-primary">{plan.price}</span>
              {plan.period && <span className="text-text-muted text-sm ml-1">{plan.period}</span>}
            </div>

            <ul className="space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="text-success mt-0.5 shrink-0">+</span>
                  {f}
                </li>
              ))}
              {plan.limits.map((l) => (
                <li key={l} className="flex items-start gap-2 text-sm text-text-subtle">
                  <span className="text-text-subtle mt-0.5 shrink-0">-</span>
                  {l}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {plan.cta === "sign_in" && !loggedIn && (
                <button onClick={startLogin} className="btn-primary w-full py-2 rounded-lg text-sm">
                  Sign in free
                </button>
              )}
              {plan.cta === "sign_in" && loggedIn && (
                <span className="block text-center text-success text-sm font-semibold">Current plan</span>
              )}
              {plan.cta === "coming_soon" && (
                <button disabled className="btn-ghost w-full py-2 rounded-lg text-sm opacity-50 cursor-not-allowed">
                  Coming soon
                </button>
              )}
              {plan.cta === null && (
                <span className="block text-center text-text-subtle text-sm">No account needed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
