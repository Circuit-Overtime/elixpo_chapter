# ReWrite — Production Build TODO

## Phase 1: Core Infrastructure (Current — Local)

- [x] Project scaffold + venv
- [x] Pollinations API wrapper (llm.py)
- [x] Basic heuristic detector
- [x] Basic paraphraser with engineered prompts
- [x] CLI interface
- [x] Restructure into modular architecture
  - [x] `core/` — config, llm, embeddings
  - [x] `detection/` — heuristics, llm_judge, ensemble, segment
  - [x] `paraphrase/` — prompts, rewriter, postprocess, targeted
  - [x] `document/` — parser, report, structure
  - [x] `session/` — store (Redis + in-memory fallback), compression
- [x] Central config module (API keys, thresholds, model selection)
- [x] Enhanced LLM wrapper (retries, timeout handling, streaming, Bearer auth)
- [x] Default model set to `kimi` via Pollinations API

## Phase 2: Detection Engine

- [x] **Deep linguistic analysis** (beyond simple heuristics)
  - [x] Perplexity estimation — self-surprise via bigram model (linguistic.py)
  - [x] N-gram frequency analysis — bigram distribution entropy (linguistic.py)
  - [x] Coherence scoring — inter-sentence Jaccard overlap (linguistic.py)
  - [x] Readability metrics — Flesch-Kincaid grade + per-paragraph consistency (linguistic.py)
  - [x] Repetition patterns — sentence opener + length-bucket template reuse (linguistic.py)
  - [x] Entropy analysis — word-level + character-level information entropy (linguistic.py)
- [x] Refine scorers — calibrated against 10 arXiv papers + kimi AI equivalents (calibrate/)
- [x] LLM-as-judge detector (calibrated prompt, 0-100 score + reasoning via kimi)
- [x] Segment-level analysis (~150-word chunks preserving sentence boundaries)
- [x] Ensemble scorer (weighted: 0.25 LLM judge + 0.43 linguistic + 0.32 heuristic, with fallback)

## Phase 3: Document Pipeline

- [x] PDF text extraction (PyPDF2)
- [x] DOCX text extraction (python-docx)
- [x] **LaTeX (.tex) text extraction** — strip commands, preserve section structure, handle math environments (parser.py)
- [x] Document structure model (sections → paragraphs → sentences hierarchy)
- [x] Annotated PDF report generation (color-coded highlights, per-paragraph scores, summary page)
- [ ] Clean rewritten PDF output (rewritten text in original formatting)

## Phase 4: Smart Paraphraser

- [x] Domain-aware prompt templates (CS, medicine, law, humanities, general)
- [x] Targeted rewriting pipeline (only segments >20% AI, with surrounding context)
- [x] Semantic similarity verification via embeddings (all-MiniLM-L6-v2, reject <0.85)
- [x] Iterative refinement loop (rewrite → re-score → retry, max 3, escalating intensity)
- [x] Post-processing pipeline (marker removal, burstiness injection, sentence starter dedup)

## Phase 5: Session & Context Management (VPS)

- [x] Redis session store (document state, scores, TTL expiry, in-memory fallback)
- [x] Context compression for long papers (LLM summarization, sliding window)
- [x] Semantic similarity via sentence-transformers (all-MiniLM-L6-v2, 384-dim, CPU)

## Phase 6: API & Deployment (VPS)

- [ ] FastAPI REST API
  - POST /api/detect — text or file upload, returns segment-level scores
  - POST /api/paraphrase — text or file, returns rewritten + scores
  - GET /api/job/{id} — poll long-running jobs
  - GET /api/report/{id}/pdf — download annotated PDF
- [ ] Background job processing (asyncio tasks)
- [ ] Rate limiting and API key management
- [ ] Docker compose (app + Redis)
- [ ] Nginx reverse proxy + SSL

## Architecture Reference

```
app/
├── core/
│   ├── config.py            # Thresholds, API keys, model IDs
│   ├── llm.py               # Pollinations wrapper (retries, streaming, Bearer auth)
│   └── embeddings.py        # Semantic similarity (all-MiniLM-L6-v2, CPU)
├── detection/
│   ├── heuristics.py        # Statistical scorers (burstiness, vocab, TTR, etc.)
│   ├── linguistic.py        # Deep analysis (perplexity, n-grams, coherence, entropy)
│   ├── llm_judge.py         # LLM evaluates AI likelihood per segment
│   ├── ensemble.py          # Weighted combination of all signals
│   └── segment.py           # Chunk text, score each segment
├── paraphrase/
│   ├── prompts.py           # Prompt templates by domain and intensity
│   ├── rewriter.py          # Core LLM rewriting + similarity verification
│   ├── postprocess.py       # Marker removal, burstiness injection, starter dedup
│   └── targeted.py          # Only rewrite flagged segments with context
├── document/
│   ├── parser.py            # PDF/DOCX/LaTeX/TXT → structured text
│   ├── report.py            # Generate annotated + clean PDFs
│   └── structure.py         # Document hierarchy model
├── session/
│   ├── store.py             # Redis + in-memory fallback session store
│   └── compression.py       # Summarize sections for context window management
└── cli.py                   # CLI with file I/O, domain, segments, report flags
```

## Detection Ensemble Weights

```
Final Score = 0.25 × LLM_judge
            + 0.15 × perplexity
            + 0.12 × burstiness
            + 0.10 × vocab_markers
            + 0.10 × coherence
            + 0.08 × n_gram_uniformity
            + 0.07 × TTR
            + 0.05 × readability
            + 0.03 × sentence_starters
            + 0.03 × paragraph_structure
            + 0.02 × punctuation_diversity
```

## Thresholds

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| AI score per segment | <20% | 20-60% | >60% |
| Semantic similarity | ≥0.85 | 0.70-0.85 | <0.70 |
| Max rewrite attempts | — | — | 3 |

## Notes

- Pollinations API uses Bearer auth — API key in .env
- Redis connected locally, also available on VPS
- Sentence-transformers running on CPU (all-MiniLM-L6-v2, 384-dim)
- LaTeX parser strips commands but preserves section/paragraph structure
- Deep linguistic features (perplexity, coherence, entropy) don't require GPU — all CPU-based with nltk/numpy
