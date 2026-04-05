# lixSearch Pollen Pricing Calculation

> Last updated: 2026-04-05

## Upstream Model Costs (Pollinations)

| Model | ID | Role | Input /M | Output /M | Other |
|-------|-----|------|:--------:|:---------:|-------|
| Moonshot Kimi K2.5 | `kimi` | Main LLM (tool loop + synthesis) | 0.6 | 3.0 | 150K context |
| Google Gemini 2.5 Flash Lite | `gemini-fast` | Vision / image analysis | 0.1 | 0.4 | |
| GPT Image 1 Mini | `gptimage` | Image generation (primary) | 2.0 | 8.0 (img out) | 2.5 (img in) |
| Qwen Image Plus | `qwen-image` | Image generation (fallback) | — | — | 0.03 /img |

## Pipeline Token Amplification

Each user request triggers multiple internal LLM calls. A single user query of ~100 tokens
generates ~10,000–60,000 tokens of internal traffic to the upstream models.

| Metric | Standard Search | Deep Search |
|--------|:--------------:|:-----------:|
| User input tokens | ~100 | ~100 |
| kimi calls | 2–3 | 8–15 |
| kimi input tokens (total) | ~10,000 | ~60,000 |
| kimi output tokens (total) | ~2,500 | ~12,000 |
| User-visible output tokens | ~1,000 | ~3,000 |
| **Input amplification factor** | **~100x** | **~600x** |
| **Output amplification factor** | **~2.5x** | **~4x** |

## Per-Request Cost Breakdown

### Standard search (~80% of traffic)

```
kimi input:   10,000 / 1M × 0.6 = 0.0060 pollen
kimi output:   2,500 / 1M × 3.0 = 0.0075 pollen
─────────────────────────────────────────────────
Total:                              0.0135 pollen
```

### Deep search (~10% of traffic)

```
kimi input:   60,000 / 1M × 0.6 = 0.0360 pollen
kimi output:  12,000 / 1M × 3.0 = 0.0360 pollen
─────────────────────────────────────────────────
Total:                              0.0720 pollen
```

### Image analysis (adds to any request type)

```
gemini-fast input:   1,000 / 1M × 0.1 = 0.0001 pollen
gemini-fast output:    500 / 1M × 0.4 = 0.0002 pollen
───────────────────────────────────────────────────────
Total:                                   0.0003 pollen  (negligible)
```

### Image generation (rare, on-demand)

```
gptimage:   ~0.01–0.03 pollen/image
qwen-image:  0.03 pollen/image
```

### Weighted average per request

```
0.80 × 0.0135  (standard)  = 0.0108
0.10 × 0.0720  (deep)      = 0.0072
0.10 × 0.0138  (standard + vision) = 0.0014
────────────────────────────────────────────
Weighted average:             ~0.02 pollen/request
```

## lixSearch Pricing (effective 2026-04-05)

| | Price /M | Derivation |
|---|:---:|---|
| **Input (promptTextTokens)** | **1.5** | kimi 0.6/M × ~100x amplification ÷ 40 (batching efficiency) ≈ 1.5 |
| **Output (completionTextTokens)** | **8.0** | kimi 3.0/M × ~2.5x multi-call overhead × ~1.07 margin ≈ 8.0 |

### Margin analysis

| Request type | Cost | Revenue (100 in / 1000 out) | Margin |
|---|:---:|:---:|:---:|
| Standard search | 0.0135 | (0.1K/1M × 1.5) + (1K/1M × 8.0) = 0.0082 | ~0.6x (subsidized by output) |
| Deep search | 0.0720 | (0.1K/1M × 1.5) + (3K/1M × 8.0) = 0.0242 | ~0.3x |

> Revenue per request is low at per-token pricing because the user sends very few tokens
> but the pipeline amplifies them heavily. The pricing is set to be competitive on
> Pollinations marketplace while covering costs at scale through volume.

## Infrastructure Overhead (not in pollen, monthly)

| Resource | Spec | Purpose |
|----------|------|---------|
| 5× app containers | 10 Hypercorn workers each | Request handling |
| 1× IPC service | sentence-transformers + Playwright pool | Embeddings + search agents |
| 1× Redis | 3 DBs (cache, embeddings, sessions) | Distributed caching |
| 1× ChromaDB | Vector store | RAG retrieval |
| 1× nginx | Load balancer | Routing + rate limiting |

## Model Registration

```js
"lixsearch": {
    aliases: ["open-search", "lix"],
    modelId: "lixsearch",
    provider: "lixsearch",
    cost: [
        {
            date: new Date("2026-04-05").getTime(),
            promptTextTokens: perMillion(1.5),
            completionTextTokens: perMillion(8.0),
        },
    ],
    description: "LixSearch - Search-Focused Model with Web Access",
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    tools: false,
    search: true,
    contextLength: 128000,
    isSpecialized: true,
    alpha: true,
},
```
