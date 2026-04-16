"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

export interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  buttonText: string;
  onSelect: () => void;
}

export default function PricingCard({
  title,
  price,
  description,
  features,
  isPopular,
  buttonText,
  onSelect,
}: PricingCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className={`relative flex flex-col p-8 rounded-3xl backdrop-blur-md border ${
        isPopular
          ? "bg-white/90 dark:bg-neutral-900/90 border-amber-500/50 shadow-2xl shadow-amber-500/10"
          : "bg-white/60 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{title}</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm h-10">{description}</p>
      </div>

      <div className="mb-6 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-neutral-900 dark:text-white">{price}</span>
        {price !== "Custom" && <span className="text-neutral-500 dark:text-neutral-400 font-medium">/mo</span>}
      </div>

      <button
        onClick={onSelect}
        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
          isPopular
            ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-md"
            : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
        }`}
      >
        {buttonText}
      </button>

      <div className="mt-8 space-y-4 flex-grow">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
          Includes:
        </p>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-300">
              <Check className="w-5 h-5 text-amber-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
