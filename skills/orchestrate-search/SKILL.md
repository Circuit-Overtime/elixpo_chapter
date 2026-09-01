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

- If a required subject, reference, scope, location, timeframe, format, or constraint is missing and different choices would materially change the result, ask one concise clarification question before calling tools.
- Do not ask for optional preferences when a safe, reversible default exists. State the assumption briefly when it matters.
- Resolve references from supplied message history or session context. If neither contains the referenced item, say what is missing and ask the user to restate or attach it; never invent the missing context.
- A clarification can continue only through the same `session_id`, a `previous_response_id`, or client-supplied message history. Treat an otherwise context-free request as standalone.
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
