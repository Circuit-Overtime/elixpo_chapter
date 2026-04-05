# ReWrite

AI text detection and paraphrasing tool for academic papers. Detects AI-generated content using a calibrated ensemble of linguistic and statistical signals, then rewrites flagged sections to read as authentically human-written.

## Features

- **Detection** — Ensemble scorer combining LLM judge + 6 calibrated heuristic/linguistic features (burstiness, vocabulary markers, n-gram uniformity, paragraph structure, repetition, punctuation diversity)
- **Paraphrasing** — Domain-aware rewriting with iterative refinement, semantic similarity verification, and post-processing pipeline
- **Document support** — PDF, DOCX, LaTeX (.tex), plain text
- **Reports** — Turnitin-style annotated PDF reports with color-coded paragraph scoring
- **API** — FastAPI REST API with background job processing for long-running tasks

## Quick Start

### Requirements

- Python 3.11+
- Redis (optional, falls back to in-memory)

### Installation

```bash
git clone <repo-url> && cd rewrite
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Pollinations API key
```

### CLI Usage

```bash
# Detect AI content in a file
python run.py detect -f paper.pdf

# Detect with per-segment breakdown
python run.py detect -f paper.tex --segments

# Generate a detection report
python run.py detect -f paper.pdf --report report.pdf

# Full pipeline: detect -> paraphrase -> report
python run.py process -f paper.tex -d cs

# Paraphrase text directly
python run.py rewrite "Your text here" -i aggressive -d cs

# Interactive mode
python run.py interactive
```

### API Usage

```bash
# Start the API server
uvicorn app.api.app:app --host 0.0.0.0 --port 8000

# Detect AI content
curl -X POST http://localhost:8000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here...", "segments": true}'

# Upload a file for detection
curl -X POST http://localhost:8000/api/detect/file \
  -F "file=@paper.pdf"

# Start a paraphrase job (returns job_id)
curl -X POST http://localhost:8000/api/paraphrase \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here...", "domain": "cs", "intensity": "aggressive"}'

# Poll job status
curl http://localhost:8000/api/job/{job_id}

# Download report PDF
curl http://localhost:8000/api/report/{job_id}/pdf -o report.pdf

# Health check
curl http://localhost:8000/api/health
```

### Docker

```bash
docker compose up --build
```

API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/detect` | Detect AI content in text |
| POST | `/api/detect/file` | Detect AI content in uploaded file |
| POST | `/api/paraphrase` | Start paraphrase job (async) |
| POST | `/api/paraphrase/file` | Start paraphrase job from file (async) |
| GET | `/api/job/{id}` | Poll job status and progress |
| GET | `/api/report/{id}/pdf` | Download PDF report for completed job |
| GET | `/api/health` | Health check |

## Supported File Types

- PDF (`.pdf`)
- Microsoft Word (`.docx`)
- LaTeX (`.tex`)
- Plain text (`.txt`, `.md`)

Max file size: 10 MB.

## Detection Scoring

Ensemble of calibrated features (weights based on Cohen's d effect sizes from arXiv paper analysis):

| Feature | Weight | Signal |
|---------|--------|--------|
| LLM Judge | 0.25 | LLM evaluates AI likelihood |
| Burstiness | 0.20 | Sentence length variance |
| Vocabulary Markers | 0.18 | AI-common word frequency |
| Paragraph Structure | 0.12 | Paragraph length uniformity |
| N-gram Uniformity | 0.10 | Word sequence predictability |
| Repetition | 0.10 | Sentence template reuse |
| Punctuation Diversity | 0.05 | Punctuation pattern variety |

Score thresholds: **<20%** human, **20-60%** mixed, **>60%** likely AI.

## Domains

Paraphrasing preserves domain-specific terminology:
- `cs` — Computer science (algorithms, complexity, system names)
- `medicine` — Drug names, dosages, p-values, clinical terms
- `law` — Case citations, statutes, legal terms
- `humanities` — Direct quotes, author names, page references
- `general` — No domain-specific preservation

## Rate Limits

- General endpoints: 60 requests/minute per IP
- Paraphrase endpoints: 5 requests/minute per IP (expensive LLM calls)

## Project Structure

```
app/
  core/         Config, LLM wrapper, embeddings
  detection/    Heuristics, linguistic analysis, LLM judge, ensemble
  paraphrase/   Prompts, rewriter, post-processing, targeted rewrite
  document/     PDF/DOCX/LaTeX parsing, report generation, structure
  session/      Redis cache, context compression
  api/          FastAPI routes, job runner, middleware, schemas
  cli.py        CLI interface
```
