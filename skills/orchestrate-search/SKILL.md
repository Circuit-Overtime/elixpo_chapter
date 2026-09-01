---
name: orchestrate-search
description: Route lixSearch requests to the smallest useful set of specialist skills and arrange independent work in parallel. Use for every request that may require web research, media processing, conversation memory, document export, deep research, or synthesis across multiple tool results.
---

# Orchestrate Search

Build a bounded execution graph. Prefer deterministic routing over an extra model call.

## Route

1. Classify the request without executing tools.
2. Select only necessary skills: `research-web`, `handle-media`, `recall-memory`, `export-documents`, and `synthesize-answer`.
3. Run independent skills concurrently.
4. Preserve dependencies: search → fetch → synthesize → export. Export is a single terminal step after the answer is finalized.
5. Stream progress as tasks begin and results arrive.
6. Cancel optional work once sufficient evidence exists.

## Routing rules

- Answer stable, self-contained questions directly.
- Use web research for information likely to have changed.
- Use deep research only for genuinely multi-part investigations.
- Do not invoke media, memory, or export speculatively.
- Never recall semantic memory for a self-contained current-information request. Memory provides continuity, not fresh evidence.
- Reuse equivalent results already present in request memory.
- Never create unbounded tasks.

## Runtime contract

    agent: orchestrator
    tools: []
    timeout_seconds: 2
    max_concurrency: 1
    output: execution_graph
