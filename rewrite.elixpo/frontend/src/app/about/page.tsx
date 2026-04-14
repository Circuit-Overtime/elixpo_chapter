"use client";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold font-display text-gradient">How ReWrite Works</h1>
        <p className="text-text-muted text-base max-w-lg mx-auto">
          A transparent look at how we detect AI-generated text and rewrite it to sound human
        </p>
      </div>

      {/* Pipeline */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold font-display text-text-primary">The Pipeline</h2>
        <div className="grid gap-4">
          <Step number={1} title="Upload" desc="You paste or upload a .tex file. We parse the LaTeX structure, extract prose paragraphs, and skip preamble, equations, section headers, and bibliography — only real prose gets analyzed." />
          <Step number={2} title="Detect" desc="Each paragraph is scored independently using our ensemble of 7 calibrated signals. Scores above 20% are flagged. The overall document score is a weighted average." />
          <Step number={3} title="Rewrite" desc="Flagged paragraphs are rewritten using domain-aware prompts at low temperatures (0.6-0.9). Each paragraph gets up to 5 attempts with escalating intensity. We verify semantic similarity to ensure meaning is preserved." />
          <Step number={4} title="Review" desc="You see a git-style diff of every change. Accept or reject the rewrite before it's applied. Download the final .tex or a PDF detection report." />
        </div>
      </section>

      {/* Detection */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold font-display text-text-primary">Detection</h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          We don't use a single classifier. Instead, we combine multiple statistical and linguistic signals into a weighted ensemble. Each signal was calibrated by comparing 10 human-written arXiv papers against their AI-generated equivalents, measuring Cohen's d effect size to find which signals truly separate human from AI writing.
        </p>
        <div className="glass-card p-5">
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-3">Ensemble formula</p>
          <code className="text-lime text-sm font-mono block leading-relaxed">
            Score = 0.25 &times; LLM Judge + 0.20 &times; Burstiness + 0.18 &times; Vocabulary<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; + 0.12 &times; Paragraph Structure + 0.10 &times; N-gram Uniformity<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; + 0.10 &times; Repetition + 0.05 &times; Punctuation Diversity
          </code>
        </div>
        <p className="text-text-muted text-xs">
          Signals like perplexity, coherence, and entropy were tested but showed no reliable separation on academic writing — they're computed but given zero weight.
        </p>
      </section>

      {/* Paraphrasing */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold font-display text-text-primary">Paraphrasing</h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          We don't just ask an LLM to "rewrite this." Our prompts are engineered to specifically counter the statistical patterns that detectors look for.
        </p>
        <div className="space-y-3">
          <Technique title="Sentence length variation" desc="AI writes sentences of uniform length (15-22 words). We force dramatic variation: 4-word sentences next to 40-word multi-clause constructions." />
          <Technique title="Vocabulary replacement" desc="Words like 'comprehensive', 'leverage', 'paradigm', 'delve' are AI markers. Our post-processor replaces 40+ flagged words with natural alternatives." />
          <Technique title="Structure breaking" desc="AI reuses grammatical templates. We require every sentence to have a different structure — inverted sentences, parenthetical asides, em-dashes." />
          <Technique title="Transition removal" desc="AI connects every idea with 'Furthermore', 'Moreover', 'Additionally'. Humans just start the next thought. We strip formulaic transitions." />
          <Technique title="Domain awareness" desc="CS papers need precise algorithm notation. Medical papers need exact dosages. Legal papers need case citations. Our prompts preserve domain-specific terminology." />
          <Technique title="Semantic verification" desc="After rewriting, we check that the new text is semantically similar to the original (cosine similarity > 0.85 using sentence embeddings). Rewrites that change meaning are rejected." />
        </div>
      </section>

      {/* What we skip */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold font-display text-text-primary">What We Skip</h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          Not everything in a .tex file is prose. We automatically identify and skip:
        </p>
        <div className="grid grid-cols-2 gap-3">
          {["LaTeX preamble (documentclass, usepackage)", "Section headers (\\section, \\subsection)", "Math environments (equations, align)", "Bibliography and citations", "Figures, tables, captions", "Comments and formatting commands"].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-text-muted">
              <span className="text-text-subtle mt-0.5 shrink-0">—</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-display text-text-primary">Tech Stack</h2>
        <div className="grid grid-cols-2 gap-3">
          <TechItem label="Detection engine" value="Python + NLTK (CPU, no GPU needed)" />
          <TechItem label="LLM provider" value="Pollinations API" />
          <TechItem label="Embeddings" value="all-MiniLM-L6-v2 (384-dim, CPU)" />
          <TechItem label="Calibration" value="10 arXiv papers, Cohen's d effect sizes" />
          <TechItem label="Frontend" value="Next.js 16 + Tailwind" />
          <TechItem label="State" value="Redis + Cloudflare D1/KV" />
        </div>
      </section>
    </div>
  );
}

function Step({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="glass-card p-4 flex gap-4">
      <div className="w-8 h-8 rounded-full bg-lime-dim border border-lime-border text-lime text-sm font-bold flex items-center justify-center shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="text-text-muted text-xs leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  );
}

function Technique({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="glass-card p-4">
      <h4 className="text-sm font-semibold text-lime">{title}</h4>
      <p className="text-text-muted text-xs leading-relaxed mt-1">{desc}</p>
    </div>
  );
}

function TechItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-3">
      <p className="text-text-subtle text-[10px] uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-text-secondary text-xs mt-1">{value}</p>
    </div>
  );
}
