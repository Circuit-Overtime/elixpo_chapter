# ReWrite — Production Build TODO

## Phase 1: Core Infrastructure (Complete)

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

## Phase 2: Detection Engine (Complete)

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

## Phase 3: Document Pipeline (Complete)

- [x] PDF text extraction (PyPDF2)
- [x] DOCX text extraction (python-docx)
- [x] **LaTeX (.tex) text extraction** — strip commands, preserve section structure, handle math environments (parser.py)
- [x] Document structure model (sections -> paragraphs -> sentences hierarchy)
- [x] Annotated PDF report generation (color-coded highlights, per-paragraph scores, summary page)
- [ ] Clean rewritten PDF output (rewritten text in original formatting)

## Phase 4: Smart Paraphraser (Complete)

- [x] Domain-aware prompt templates (CS, medicine, law, humanities, general)
- [x] Targeted rewriting pipeline (only segments >20% AI, with surrounding context)
- [x] Semantic similarity verification via embeddings (all-MiniLM-L6-v2, reject <0.85)
- [x] Iterative refinement loop (rewrite -> re-score -> retry, max 5, escalating intensity)
- [x] Post-processing pipeline (marker removal, burstiness injection, sentence starter dedup)

## Phase 5: Session & Context Management (Complete)

- [x] Redis session store (document state, scores, TTL expiry, in-memory fallback)
- [x] Context compression for long papers (LLM summarization, sliding window)
- [x] Semantic similarity via sentence-transformers (all-MiniLM-L6-v2, 384-dim, CPU)

## Phase 6: API & Deployment — P0 (In Progress)

### 6.1 FastAPI REST API
- [ ] App factory + CORS + error handlers
- [ ] `POST /api/detect` — text or file upload, returns segment-level scores
- [ ] `POST /api/paraphrase` — text or file, returns job ID for polling
- [ ] `GET /api/job/{id}` — poll long-running paraphrase jobs (status + progress)
- [ ] `GET /api/report/{id}/pdf` — download annotated PDF report
- [ ] `POST /api/upload` — file upload endpoint (PDF, DOCX, LaTeX, TXT)

### 6.2 Background Job Processing
- [ ] In-memory job store (dict-based, upgradeable to Redis)
- [ ] Async job runner for paraphrase tasks (threaded to avoid blocking API)
- [ ] Job progress tracking (per-paragraph updates)
- [ ] Job result cleanup (TTL-based expiry)

### 6.3 Input Validation & Security
- [ ] File size limit (10 MB max)
- [ ] Max page/paragraph count limits
- [ ] Supported file type validation
- [ ] Text length validation (min 50 chars, max 100k chars)
- [ ] Request body size limits

### 6.4 Rate Limiting
- [ ] Per-IP rate limiting on all endpoints
- [ ] Stricter limits on paraphrase (expensive LLM calls)
- [ ] Rate limit headers in responses (X-RateLimit-*)

### 6.5 Deployment
- [ ] Dockerfile (Python 3.11 slim + deps)
- [ ] docker-compose.yml (app + Redis)
- [ ] .env.example with placeholder values
- [ ] Gunicorn/uvicorn production config

### 6.6 Documentation
- [ ] README.md (installation, usage, API reference, supported formats)

## Phase 7: Frontend & Auth (Planned)

- [ ] Web frontend (file upload, results view, download rewritten doc)
- [ ] Elixpo OAuth integration (login/signup)
- [ ] Per-user usage tracking and history
- [ ] Progress indicator for long paraphrase jobs

## Phase 8: Performance & Polish (Planned)

- [ ] Parallel paragraph processing (concurrent LLM calls)
- [ ] Clean rewritten PDF output (formatted like original)
- [ ] Slim torch dependency (CPU-only wheel or onnxruntime)
- [ ] User-friendly error messages
- [ ] Core test suite (detection, paraphrasing, parsing, reports)
- [ ] Proper Python packaging (pyproject.toml, __version__)

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
│   ├── parser.py            # PDF/DOCX/LaTeX/TXT -> structured text
│   ├── report.py            # Generate annotated + clean PDFs
│   ├── structure.py         # Document hierarchy model
│   └── tex_writer.py        # LaTeX rewriting preserving structure
├── session/
│   ├── store.py             # Redis + in-memory fallback session store
│   └── compression.py       # Summarize sections for context window management
├── api/                     # NEW — Phase 6
│   ├── app.py               # FastAPI application factory
│   ├── routes/
│   │   ├── detect.py        # Detection endpoints
│   │   ├── paraphrase.py    # Paraphrase endpoints
│   │   ├── jobs.py          # Job polling endpoints
│   │   └── reports.py       # Report download endpoints
│   ├── jobs.py              # Background job runner
│   ├── middleware.py        # Rate limiting, CORS, error handling
│   └── schemas.py           # Pydantic request/response models
└── cli.py                   # CLI with file I/O, domain, segments, report flags
```

## Detection Ensemble Weights (Calibrated)

```
Final Score = 0.25 x LLM_judge
            + 0.20 x burstiness        (d=2.01)
            + 0.18 x vocab_markers      (d=1.81)
            + 0.12 x paragraph_structure (d=1.15)
            + 0.10 x n_gram_uniformity  (d=1.03)
            + 0.10 x repetition         (d=0.95)
            + 0.05 x punctuation_div    (d=0.46)
```

## Thresholds

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| AI score per segment | <20% | 20-60% | >60% |
| Semantic similarity | >=0.85 | 0.70-0.85 | <0.70 |
| Max rewrite attempts | -- | -- | 5 |

## Notes

- Pollinations API uses Bearer auth — API key in .env
- Redis connected locally, also available on VPS
- Sentence-transformers running on CPU (all-MiniLM-L6-v2, 384-dim)
- LaTeX parser strips commands but preserves section/paragraph structure
- Deep linguistic features (perplexity, coherence, entropy) don't require GPU — all CPU-based with nltk/numpy
- Paraphrase temperatures kept LOW (0.6-0.9) — high temps produce more detectable text
- Always rewrite from original text, not from failed rewrites
