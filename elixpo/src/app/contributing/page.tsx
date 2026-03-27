"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const RAW_URL =
  "https://raw.githubusercontent.com/elixpo/elixpo_chapter/main/CONTRIBUTING.md";

export default function ContributingPage() {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(RAW_URL)
      .then((res) => res.text())
      .then((text) => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(() => {
        setMarkdown("# Failed to load\n\nCould not fetch the contributing guide. Please visit [GitHub](https://github.com/elixpo/elixpo_chapter/blob/main/CONTRIBUTING.md) directly.");
        setLoading(false);
      });
  }, []);

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <article className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </article>
        )}
      </div>
    </section>
  );
}
