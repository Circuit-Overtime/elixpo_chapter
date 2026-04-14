"use client";

const signals = [
  {
    name: "LLM Judge",
    weight: 25,
    cohensD: null,
    category: "AI evaluation",
    what: "An LLM reads the text and evaluates how likely it is to be AI-generated, returning a 0-100 score with reasoning.",
    why: "LLMs can spot patterns that statistical methods miss — awkward phrasing that sounds 'too correct', lack of genuine opinion, formulaic structure.",
    how: "We send the text with a calibrated system prompt to a language model at temperature 0.1 (near-deterministic). The model scores and explains its reasoning.",
    example: "A human might write: 'The results were, frankly, a bit disappointing.' An AI would write: 'The results demonstrate suboptimal performance metrics.'",
  },
  {
    name: "Burstiness",
    weight: 20,
    cohensD: 2.01,
    category: "Statistical",
    what: "Measures how much sentence lengths vary within a paragraph. Low burstiness = uniform lengths = AI-like.",
    why: "AI generates sentences of remarkably consistent length (15-22 words). Human writers naturally produce bursts: a 4-word sentence, then a 38-word compound sentence, then a 9-word one.",
    how: "We compute the coefficient of variation (standard deviation / mean) of sentence word counts. CV below 0.4 is flagged. Humans typically have CV > 0.5.",
    example: "AI: 'The model processes input data. It generates accurate predictions. The system handles edge cases.' (14, 12, 13 words — nearly identical). Human: 'It works. Most of the time, the model produces reasonable outputs, though occasionally — and this is worth noting — the edge cases reveal surprising failure modes that warrant further investigation.' (5 vs 31 words).",
  },
  {
    name: "Vocabulary Markers",
    weight: 18,
    cohensD: 1.81,
    category: "Lexical",
    what: "Counts AI-characteristic words and phrases that appear disproportionately in generated text.",
    why: "LLMs have strong preferences for certain formal-sounding words that human academics rarely use: 'delve', 'leverage', 'comprehensive', 'facilitate', 'paradigm', 'groundbreaking'.",
    how: "We maintain a dictionary of 40+ flagged words and their frequencies in known AI text. The score reflects what percentage of the vocabulary consists of these markers.",
    flaggedWords: ["delve", "comprehensive", "leverage", "facilitate", "robust", "seamless", "groundbreaking", "paradigm", "pivotal", "intricate", "multifaceted", "endeavor", "holistic", "synergy", "tapestry", "realm", "foster", "bolster", "meticulous", "underscores"],
    example: "'This paper delves into the multifaceted landscape of leveraging robust paradigms...' — almost every content word is an AI marker.",
  },
  {
    name: "Paragraph Structure",
    weight: 12,
    cohensD: 1.15,
    category: "Structural",
    what: "Measures how uniform paragraph lengths are across the document.",
    why: "AI tends to produce paragraphs of similar size (4-6 sentences each). Human writing has dramatic variation: a 2-sentence paragraph followed by a 10-sentence one.",
    how: "We compute the coefficient of variation of paragraph word counts. Low variation signals AI.",
    example: "AI: Every paragraph is 80-100 words. Human: One paragraph is 20 words (a sharp observation), the next is 200 words (a detailed explanation).",
  },
  {
    name: "N-gram Uniformity",
    weight: 10,
    cohensD: 1.03,
    category: "Statistical",
    what: "Measures how predictable word sequences are by analyzing bigram (two-word pair) distributions.",
    why: "AI text flows too smoothly — each word follows predictably from the last. Human text has more surprising word choices and unusual collocations.",
    how: "We build a bigram frequency distribution and measure its entropy. Low entropy (flat, predictable distribution) indicates AI.",
    example: "AI always pairs 'play' with 'role' and 'shed' with 'light'. A human might write 'cast clarity on' or 'uncover the dynamics of' instead.",
  },
  {
    name: "Repetition",
    weight: 10,
    cohensD: 0.95,
    category: "Structural",
    what: "Detects reused sentence templates, repeated openers, and recycled grammatical structures.",
    why: "AI falls into patterns: 'The X of Y has Z', 'This approach enables...', starting multiple sentences with 'Furthermore'. Humans vary their sentence construction more naturally.",
    how: "We analyze sentence opener words, grammatical structure templates (based on sentence length buckets), and flag when patterns repeat more than twice.",
    example: "'The model achieves... The system demonstrates... The approach facilitates...' — same Subject-Verb-Object template three times.",
  },
  {
    name: "Punctuation Diversity",
    weight: 5,
    cohensD: 0.46,
    category: "Stylistic",
    what: "Measures the variety of punctuation marks used beyond periods and commas.",
    why: "AI rarely uses semicolons, em-dashes, colons in the middle of sentences, or parenthetical asides. Human academic writing naturally includes these.",
    how: "We count the ratio of diverse punctuation (;  —  :  ()  !) to total punctuation. Low diversity flags AI.",
    example: "AI: Only periods and commas. Human: 'The results — while preliminary — suggest a pattern; one that merits further investigation (see Appendix B).'",
  },
];

const zeroWeightSignals = [
  { name: "Perplexity", reason: "Self-surprise via bigram model. Academic writing by nature has low perplexity regardless of author — technical vocabulary is inherently predictable." },
  { name: "Coherence", reason: "Inter-sentence word overlap. Good academic writing (human or AI) maintains high coherence by design." },
  { name: "Readability", reason: "Flesch-Kincaid grade level. Academic papers consistently score at grade 14-16 whether human or AI-written." },
  { name: "Entropy", reason: "Shannon information entropy. The signal inverted on academic text — human research papers sometimes have lower entropy than AI versions." },
  { name: "Type-Token Ratio", reason: "Lexical diversity. Technical papers reuse domain terms heavily, masking any human/AI difference." },
  { name: "Sentence Starters", reason: "Variety of first words. Too noisy on short paragraphs to be reliable." },
];

export default function LearnPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold font-display text-gradient">Detection Signals</h1>
        <p className="text-text-muted text-base max-w-lg mx-auto">
          Every signal we use, why it works, how we measure it, and what it catches
        </p>
      </div>

      {/* Overview */}
      <section className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-bold font-display text-text-primary">How scoring works</h2>
        <p className="text-text-secondary text-xs leading-relaxed">
          Each paragraph gets scored 0-100% by each signal independently. The final score is a weighted average using the weights shown below. Weights were calibrated by comparing human vs AI-generated versions of 10 arXiv research papers using Cohen's d effect size — a statistical measure of how well each signal separates the two groups.
        </p>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> &lt;20% Human</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /> 20-60% Mixed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-error" /> &gt;60% Likely AI</span>
        </div>
      </section>

      {/* Active signals */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold font-display text-text-primary">Active Signals ({signals.length})</h2>
        {signals.map((s) => (
          <SignalCard key={s.name} signal={s} />
        ))}
      </section>

      {/* Zero-weight signals */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold font-display text-text-primary">Inactive Signals</h2>
        <p className="text-text-muted text-xs">
          These are computed but given zero weight — they didn't reliably separate human from AI on academic text.
        </p>
        <div className="space-y-2">
          {zeroWeightSignals.map((s) => (
            <div key={s.name} className="glass-card p-3 flex items-start gap-3">
              <span className="text-text-subtle text-xs font-semibold shrink-0 w-28">{s.name}</span>
              <p className="text-text-muted text-xs leading-relaxed">{s.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Paraphrasing techniques */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold font-display text-text-primary">Paraphrasing Strategy</h2>
        <p className="text-text-secondary text-xs leading-relaxed">
          Our paraphraser is designed to specifically counter each detection signal. It doesn't just "rewrite" — it targets the exact statistical properties that detectors measure.
        </p>

        <div className="space-y-3">
          <StrategyCard
            signal="Burstiness"
            strategy="Force sentence length variance"
            detail="The prompt requires at least 2 sentences under 7 words and 1 sentence over 35 words per paragraph. The post-processor injects burstiness if the LLM doesn't achieve it naturally."
          />
          <StrategyCard
            signal="Vocabulary"
            strategy="Banned word list + post-processing"
            detail="40+ AI marker words are listed in the system prompt as banned. After generation, a post-processor does a second pass replacing any stragglers (delve→explore, leverage→use, paradigm→model)."
          />
          <StrategyCard
            signal="Repetition"
            strategy="Mandatory structural variation"
            detail="Every sentence must have a different grammatical structure. At least 3 sentences must start with something other than the subject (prepositional phrase, dependent clause, number)."
          />
          <StrategyCard
            signal="Transitions"
            strategy="Strip formulaic connectors"
            detail="The prompt bans starting sentences with Furthermore, Moreover, Additionally, It is. The post-processor fixes cross-paragraph repeated openers."
          />
          <StrategyCard
            signal="Temperature"
            strategy="Low and controlled (0.6-0.9)"
            detail="High temperatures (>1.0) produce random, incoherent text that detectors flag even more. We keep temperatures low for controlled, coherent output and increment by 0.1 on retries."
          />
          <StrategyCard
            signal="Integrity"
            strategy="Semantic similarity check"
            detail="Every rewrite is checked against the original using sentence embeddings (cosine similarity). If similarity drops below 0.85, the rewrite is rejected and retried — meaning is never sacrificed."
          />
        </div>
      </section>

      {/* Iterative refinement */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold font-display text-text-primary">Iterative Refinement</h2>
        <p className="text-text-secondary text-xs leading-relaxed">
          Each flagged paragraph goes through up to 5 rewrite attempts:
        </p>
        <div className="glass-card p-4 font-mono text-xs text-text-secondary space-y-1">
          <p><span className="text-lime">Attempt 1</span> — temp 0.6, aggressive rewrite with detection feedback</p>
          <p><span className="text-lime">Attempt 2</span> — temp 0.7, feedback from attempt 1 scores</p>
          <p><span className="text-lime">Attempt 3</span> — temp 0.8, escalated feedback</p>
          <p><span className="text-lime">Attempt 4</span> — temp 0.85, targeted fixes</p>
          <p><span className="text-lime">Attempt 5</span> — temp 0.9, final attempt</p>
          <p className="text-text-muted pt-1">If score drops below 20% at any point → accept and move on</p>
          <p className="text-text-muted">Always rewrites from the original text, never from failed attempts</p>
        </div>
      </section>
    </div>
  );
}

function SignalCard({ signal }: { signal: typeof signals[0] }) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border-light">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-text-primary">{signal.name}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-glass border border-border-light text-text-muted">{signal.category}</span>
        </div>
        <div className="flex items-center gap-3">
          {signal.cohensD && (
            <span className="text-[10px] font-mono text-text-subtle">d={signal.cohensD.toFixed(2)}</span>
          )}
          <span className="text-xs font-bold font-mono text-lime">{signal.weight}%</span>
        </div>
      </div>

      {/* Weight bar */}
      <div className="h-1 bg-bg-glass">
        <div className="h-full bg-lime transition-all" style={{ width: `${signal.weight * 4}%` }} />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">What it measures</p>
          <p className="text-text-secondary text-xs leading-relaxed">{signal.what}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">Why it works</p>
          <p className="text-text-secondary text-xs leading-relaxed">{signal.why}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">How we compute it</p>
          <p className="text-text-secondary text-xs leading-relaxed">{signal.how}</p>
        </div>
        {signal.example && (
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">Example</p>
            <p className="text-text-muted text-xs leading-relaxed italic">{signal.example}</p>
          </div>
        )}
        {signal.flaggedWords && (
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">Flagged words</p>
            <div className="flex flex-wrap gap-1">
              {signal.flaggedWords.map((w) => (
                <span key={w} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.08)] text-error border border-[rgba(239,68,68,0.2)]">
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StrategyCard({ signal, strategy, detail }: { signal: string; strategy: string; detail: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-dim text-lime border border-lime-border font-semibold">{signal}</span>
        <span className="text-sm font-semibold text-text-primary">{strategy}</span>
      </div>
      <p className="text-text-muted text-xs leading-relaxed">{detail}</p>
    </div>
  );
}
