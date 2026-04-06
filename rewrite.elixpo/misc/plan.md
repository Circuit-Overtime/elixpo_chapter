# AI Text Detection & Paraphraser — Full Build Plan

---

## 1. Overview

Two tools, one unified system:

- **Detector** — scores any text on AI-likelihood (0–100%)
- **Paraphraser** — rewrites AI-generated text to evade detection by maximizing human-like statistical properties

---

## 2. How AI Detectors Work

### 2.1 Perplexity Analysis
AI models select the most probable next token at each step, producing text with **low perplexity** — it is statistically predictable. Human writing is less optimal, resulting in **higher perplexity**. Detectors compute perplexity using a reference language model and flag low-perplexity text as AI-generated.

### 2.2 Burstiness
Humans naturally vary sentence length and complexity — short punchy sentences followed by long, winding ones. AI tends to produce **uniformly structured output**. Burstiness is measured as the variance in sentence length across a passage.

### 2.3 Statistical Fingerprinting
Turnitin, GPTZero, and similar tools train binary classifiers on millions of labeled samples (AI vs. human). They learn subtle token-probability distribution patterns that persist even after light editing.

### 2.4 Vocabulary & Style Markers
AI models overuse certain tokens: "delve", "crucial", "notably", "it is important to note", "in conclusion", etc. Detectors flag high frequency of these as a signal.

### 2.5 Watermarking (Emerging)
Some providers embed invisible statistical watermarks into output by biasing token selection from specific "green" token lists. Even if text is lightly paraphrased, the watermark signal partially survives.

---

## 3. How Detection Bypassing Works

A high-quality paraphraser needs to attack all of the above signals simultaneously.

| Technique | Purpose |
|---|---|
| Increase perplexity | Use less probable synonyms and unexpected phrasing |
| Increase burstiness | Deliberately vary sentence lengths — mix very short and very long |
| Lexical substitution | Replace AI vocabulary markers with domain-appropriate alternatives |
| Syntactic restructuring | Flip clause order, change active/passive voice, split or merge sentences |
| Discourse variation | Add hedging language, first-person voice, imperfect transitions |
| Semantic preservation | Ensure meaning is fully retained despite surface-level changes |

---

## 4. System Architecture

```
User Input (text)
      |
      v
+---------------------+
|   Pre-processor     |  Tokenize, sentence-split, clean
+---------------------+
      |
      v
+---------------------+        +----------------------+
|   Detector Module   |        |  Paraphraser Module  |
|---------------------|        |----------------------|
| - Perplexity scorer |        | - LLM-based rewriter |
| - Burstiness calc   |        | - Perplexity booster |
| - Vocab marker scan |        | - Burstiness injector|
| - ML classifier     |        | - Vocab substitution |
+---------------------+        +----------------------+
      |                                |
      v                                v
  AI Score (0-100%)           Rewritten Human-like Text
```

---

## 5. Detector — Implementation Plan

### 5.1 Features to Extract

| Feature | Method |
|---|---|
| Perplexity | Run text through a local LLM (e.g., GPT-2 or LLaMA), compute token log-probabilities |
| Burstiness | Compute variance of sentence lengths (in tokens) |
| Type-Token Ratio (TTR) | Unique words / total words — AI tends to be lower |
| AI Vocabulary Score | Count occurrences of known AI marker words from a curated list |
| Named Entity Density | NER tagging — AI tends to use fewer specific proper nouns |
| Avg sentence complexity | Dependency parse depth — AI tends to be shallower |

### 5.2 Classifier

- **Training data**: Human papers from arXiv, PubMed, ACL Anthology + AI-generated equivalents
- **Model**: Fine-tuned RoBERTa or a lightweight XGBoost on extracted features
- **Output**: Probability score 0.0–1.0 (AI likelihood)

### 5.3 Tech Stack (Detector)

```
Python
├── transformers      # Perplexity scoring via GPT-2 / RoBERTa
├── spaCy             # NER, sentence splitting, dependency parsing
├── scikit-learn      # Feature-based classifier
├── FastAPI           # REST API endpoint
└── React             # Frontend UI
```

---

## 6. Paraphraser — Implementation Plan

### 6.1 Core Strategy

Use an LLM with a carefully engineered system prompt that instructs it to:

1. Rewrite the passage while preserving all factual content and citations
2. Vary sentence length dramatically (target burstiness > threshold)
3. Replace low-surprise words with higher-perplexity alternatives
4. Introduce natural hedging, transitions, and academic first-person voice
5. Avoid all known AI vocabulary markers (from curated blocklist)

### 6.2 System Prompt Template

```
You are an expert academic editor. Rewrite the following text so that:
- Sentence lengths vary dramatically (mix very short and very long sentences)
- Word choices are specific, domain-appropriate, and occasionally unexpected
- Avoid these words entirely: [delve, crucial, notably, it is worth noting, 
  in conclusion, furthermore, moreover, it is important to note, comprehensive]
- Preserve all factual claims, citations, and technical terminology exactly
- Write as a human researcher would — include hedging language, 
  first-person where appropriate, and natural imperfections in flow
- Do not sound like an AI assistant

Text to rewrite:
{input_text}
```

### 6.3 Post-Processing Pipeline

After LLM rewrite:
1. **Perplexity check** — score the output; if still low, trigger a second rewrite pass with higher temperature
2. **Burstiness check** — if sentence length variance is below threshold, inject sentence splits/merges
3. **Vocab scan** — flag and replace any remaining AI marker words
4. **Meaning verification** — semantic similarity check (cosine similarity via sentence-transformers) to confirm content is preserved

### 6.4 Tech Stack (Paraphraser)

```
Python / JavaScript
├── Anthropic API / OpenAI API    # Core LLM rewriting
├── sentence-transformers          # Semantic similarity verification
├── transformers (GPT-2)          # Perplexity scoring of output
├── FastAPI                        # Backend API
└── React                          # Frontend UI
```

---

## 7. Frontend UI Plan

### Pages / Panels

1. **Detector Panel**
   - Paste text input
   - Output: AI score gauge (0–100%), breakdown by feature (perplexity, burstiness, vocab markers)
   - Color coded: Green (human) → Red (AI)

2. **Paraphraser Panel**
   - Paste AI-generated text
   - Select rewrite intensity (Light / Medium / Aggressive)
   - Output: Rewritten text + side-by-side diff view
   - Auto-run detector on output to show score improvement

3. **Dashboard (optional)**
   - History of scanned documents
   - Score trends over time

---

## 8. Data Sources for Training

| Dataset | Use |
|---|---|
| arXiv papers (open access) | Human-written research text |
| PubMed abstracts | Human-written scientific abstracts |
| ACL Anthology | Human-written NLP/CS papers |
| GPT-4 / Claude generated versions of above | AI-written counterparts |
| HC3 Dataset (HuggingFace) | Human vs ChatGPT answer pairs |
| RAID Dataset | Research-grade AI detection benchmark |

---

## 9. Evaluation Metrics

### Detector
- Accuracy, Precision, Recall, F1 on held-out test set
- False positive rate (human text flagged as AI) — must be minimized
- Benchmark against GPTZero and Turnitin on same samples

### Paraphraser
- Pre/post AI detection score delta (target: drop score below 30%)
- Semantic similarity to original (target: > 0.85 cosine similarity)
- Perplexity increase ratio
- Burstiness increase ratio

---

## 10. Limitations & Ethical Notes

- No paraphraser can guarantee 100% bypass — detectors are continuously updated
- Watermark-based detection (e.g., OpenAI's scheme) is partially resilient to paraphrasing
- This system is intended for research into detection robustness, not academic fraud
- A responsible deployment would include a terms-of-service prohibiting use for submission of AI work as human work in academic contexts

---

## 11. Phased Build Roadmap

| Phase | Deliverable | Timeline |
|---|---|---|
| 1 | Basic LLM-powered paraphraser UI (no scoring) | Week 1 |
| 2 | Perplexity + burstiness scorer integrated | Week 2 |
| 3 | Vocab marker scan + post-processing pipeline | Week 3 |
| 4 | ML classifier trained on research paper dataset | Week 4–5 |
| 5 | Full UI with side-by-side diff and score dashboard | Week 6 |
| 6 | Evaluation, benchmarking, and optimization | Week 7–8 |