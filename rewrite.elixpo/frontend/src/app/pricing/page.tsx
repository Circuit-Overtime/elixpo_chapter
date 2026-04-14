"use client";

import { startLogin } from "@/lib/auth";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const plans = [
  {
    id: "guest",
    name: "Guest",
    price: "Free",
    period: "",
    description: "Try it out instantly — no sign-up",
    features: [
      { text: "1 AI check per day", included: true },
      { text: "100 word limit", included: true },
      { text: "Per-paragraph scoring", included: true },
      { text: "Paraphrasing", included: false },
      { text: "File upload", included: false },
      { text: "PDF reports", included: false },
      { text: "Session history", included: false },
    ],
    cta: null,
    highlight: false,
  },
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For students who need the full toolkit",
    features: [
      { text: "5 AI checks per day", included: true },
      { text: "3 rewrites per day", included: true },
      { text: "1,000 word limit", included: true },
      { text: "File upload (.tex)", included: true },
      { text: "Full PDF detection report", included: true },
      { text: "Session history & resume", included: true },
      { text: "API access", included: false },
    ],
    cta: "sign_in",
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$4.99",
    period: "/month",
    description: "For power users and full papers",
    features: [
      { text: "Unlimited AI checks", included: true },
      { text: "Unlimited rewrites", included: true },
      { text: "25,000 word limit", included: true },
      { text: "Priority processing queue", included: true },
      { text: "Full PDF detection report", included: true },
      { text: "Bulk file processing", included: true },
      { text: "API access", included: true },
    ],
    cta: "upgrade",
    highlight: false,
  },
];

const comparisonRows = [
  { label: "AI checks", guest: "1/day", free: "5/day", pro: "Unlimited" },
  { label: "Rewrites", guest: "—", free: "3/day", pro: "Unlimited" },
  { label: "Word limit", guest: "100", free: "1,000", pro: "25,000" },
  { label: "File upload", guest: "—", free: "Yes", pro: "Yes" },
  { label: "PDF reports", guest: "—", free: "Yes", pro: "Yes" },
  { label: "History & resume", guest: "—", free: "Yes", pro: "Yes" },
  { label: "Priority queue", guest: "—", free: "—", pro: "Yes" },
  { label: "API access", guest: "—", free: "—", pro: "Yes" },
  { label: "Bulk processing", guest: "—", free: "—", pro: "Yes" },
];

export default function PricingPage() {
  const { loggedIn } = useAuth();
  const [yearly, setYearly] = useState(false);

  const proPrice = yearly ? "$3.99" : "$4.99";
  const proPeriod = yearly ? "/mo billed yearly" : "/month";
  const proSavings = yearly ? "Save 20%" : null;

  return (
    <div className="max-w-5xl mx-auto px-6 space-y-12 pt-6 pb-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold font-display text-gradient">
          Simple, student-friendly pricing
        </h1>
        <p className="text-text-muted text-sm max-w-md mx-auto">
          Generous free tier for everyday use. Upgrade only when you need full papers processed.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className={`text-xs ${!yearly ? "text-text-primary" : "text-text-muted"}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              yearly ? "bg-lime-dim border border-lime-border" : "bg-bg-glass border border-border-light"
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
              yearly ? "translate-x-5 bg-lime" : "translate-x-0.5 bg-text-subtle"
            }`} />
          </button>
          <span className={`text-xs ${yearly ? "text-text-primary" : "text-text-muted"}`}>
            Yearly
            {yearly && <span className="text-lime ml-1 font-semibold">-20%</span>}
          </span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const displayPrice = plan.id === "pro" ? proPrice : plan.price;
          const displayPeriod = plan.id === "pro" ? proPeriod : plan.period;

          return (
            <div
              key={plan.id}
              className={`glass-card p-6 flex flex-col relative ${
                plan.highlight ? "border-lime-border shadow-[0_0_30px_rgba(163,230,53,0.08)]" : ""
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-lime bg-[#1a1f1c] px-3 py-0.5 rounded-full border border-lime-border">
                  Most popular
                </span>
              )}

              {plan.id === "pro" && proSavings && (
                <span className="absolute -top-2.5 right-4 text-[10px] font-semibold text-honey bg-[#1a1f1c] px-2 py-0.5 rounded-full border border-[rgba(251,191,36,0.3)]">
                  {proSavings}
                </span>
              )}

              <h2 className="text-lg font-bold font-display text-text-primary mt-1">
                {plan.name}
              </h2>
              <p className="text-text-muted text-xs mt-1">{plan.description}</p>

              <div className="mt-4 mb-5">
                <span className="text-3xl font-bold text-text-primary">{displayPrice}</span>
                {displayPeriod && <span className="text-text-muted text-sm ml-1">{displayPeriod}</span>}
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <svg className="w-4 h-4 text-success shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-text-subtle shrink-0 mt-0.5 opacity-40" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                    <span className={f.included ? "text-text-secondary" : "text-text-subtle"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.cta === "sign_in" && !loggedIn && (
                  <button onClick={startLogin} className="btn-primary w-full py-2.5 rounded-lg text-sm">
                    Sign up free
                  </button>
                )}
                {plan.cta === "sign_in" && loggedIn && (
                  <div className="flex items-center justify-center gap-2 py-2.5">
                    <svg className="w-4 h-4 text-success" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-success text-sm font-semibold">Current plan</span>
                  </div>
                )}
                {plan.cta === "upgrade" && (
                  <button className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[rgba(251,191,36,0.1)] text-honey border border-[rgba(251,191,36,0.3)] hover:bg-[rgba(251,191,36,0.18)] transition-all">
                    Coming soon
                  </button>
                )}
                {plan.cta === null && (
                  <a href="/" className="block text-center btn-ghost py-2.5 rounded-lg text-sm">
                    Try now
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-bold font-display text-text-primary text-center mb-6">
          Feature comparison
        </h2>
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-3 px-4 text-text-muted font-normal">Feature</th>
                <th className="text-center py-3 px-4 text-text-muted font-normal">Guest</th>
                <th className="text-center py-3 px-4 text-lime font-semibold">Free</th>
                <th className="text-center py-3 px-4 text-honey font-semibold">Pro</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b border-border-light last:border-0 hover:bg-bg-glass transition-colors">
                  <td className="py-3 px-4 text-text-secondary">{row.label}</td>
                  <td className="py-3 px-4 text-center text-text-muted">{row.guest}</td>
                  <td className="py-3 px-4 text-center text-text-secondary">{row.free}</td>
                  <td className="py-3 px-4 text-center text-text-primary font-medium">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-lg font-bold font-display text-text-primary text-center mb-6">
          Frequently asked questions
        </h2>

        <FAQ
          q="What counts as a word?"
          a="We count whitespace-separated tokens in the extracted text. LaTeX commands and markup are excluded from the count."
        />
        <FAQ
          q="What happens when I hit my daily limit?"
          a="You'll see a message with your remaining quota. Limits reset at midnight UTC. Upgrade to Pro for unlimited usage."
        />
        <FAQ
          q="Can I cancel Pro anytime?"
          a="Yes — cancel anytime from your account settings. You keep Pro access until the end of your billing period."
        />
        <FAQ
          q="Is my text stored?"
          a="Text is held in session only during processing and deleted after 24 hours. We never train on your content."
        />
        <FAQ
          q="How accurate is the detection?"
          a="Our ensemble scorer combines 7 calibrated signals. It's tuned for academic writing — results may vary for other content types."
        />
      </div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="text-sm text-text-primary font-medium">{q}</span>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform shrink-0 ml-4 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-text-muted leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}
