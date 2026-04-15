"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PricingCard from "@/components/pricing/PricingCard";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  const tiers = [
    {
      title: "Free",
      price: "$0",
      description: "Perfect for exploring the AI capabilities before committing.",
      buttonText: "Start for Free",
      features: [
        "100 AI Chat messages per month",
        "Standard response times",
        "Basic Weather & News discovery",
        "7-day chat history retention",
      ],
      isPopular: false,
    },
    {
      title: "Pro",
      price: isAnnual ? "$15" : "$19",
      description: "Everything you need for daily intelligent workflows.",
      buttonText: "Upgrade to Pro",
      features: [
        "Unlimited AI Chat messages",
        "Fastest model access (GPT-4 / Claude 3)",
        "Daily personalized Podcast generation",
        "Unlimited chat history",
        "Attach large artifacts & images",
      ],
      isPopular: true,
    },
    {
      title: "Max",
      price: isAnnual ? "$39" : "$49",
      description: "Maximum limits for professionals and heavy users.",
      buttonText: "Get Max",
      features: [
        "Everything in Pro",
        "Active Voice Input & Transcription",
        "Priority API & Pipeline queue",
        "Custom Podcast Voices",
        "Export chat data & Analytics",
      ],
      isPopular: false,
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-[family-name:var(--font-parkinsans)] flex flex-col">
      <Navbar />
      
      <div className="flex-grow pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Abstract background blur */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] -z-10" />

        <div className="max-w-6xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-neutral-900 dark:text-white mb-6"
          >
            Simple, transparent pricing
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-10"
          >
            Unlock the full power of Elixpo Chat. Explore news, generate custom podcasts, and chat without limits.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4 mb-16"
          >
            <span className={`text-sm font-semibold ${!isAnnual ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}>
              Monthly
            </span>
            
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-16 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 p-1 cursor-pointer transition-colors"
            >
              <motion.div 
                className="w-6 h-6 rounded-full bg-white dark:bg-neutral-400 shadow-sm"
                layout
                animate={{ 
                  x: isAnnual ? 32 : 0,
                  backgroundColor: isAnnual ? "#f59e0b" : "" // Tailwind amber-500
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${isAnnual ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}>
                Annually
              </span>
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto text-left">
            {tiers.map((tier, idx) => (
              <motion.div
                key={tier.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
              >
                <PricingCard 
                  {...tier}
                  onSelect={() => console.log(`Selected ${tier.title}`)}
                />
              </motion.div>
            ))}
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
