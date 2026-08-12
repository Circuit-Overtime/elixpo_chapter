---
name: research-web
description: Find, fetch, and verify current web information for lixSearch. Use for live facts, news, prices, comparisons, source-backed questions, URL reading, local-time lookups, and complex investigations requiring multiple subtopics.
---

# Research Web

Search efficiently and return compact evidence with source URLs.

## Workflow

1. Use `web_search` with the narrowest useful query and depth.
2. Deduplicate and rank URLs before fetching.
3. Run independent `fetch_full_text` calls concurrently.
4. Prefer primary and authoritative sources.
5. Record claims with supporting URLs; never invent missing evidence.
6. Use `deep_research` only when the request requires a genuinely multi-part investigation.
7. Use `get_local_time` only for location-specific time questions.

## Performance rules

- Start fetching as search results arrive.
- Default to `standard`; use `quick` for lookups and `thorough` only when necessary.
- Stop after sufficient high-quality evidence is collected.
- Reuse request-level cached work.
- Return evidence to synthesis instead of writing a second full answer.

## Runtime contract

    agent: research
    tools: [web_search, fetch_full_text, get_local_time, deep_research]
    timeout_seconds: 20
    depends_on: [optimize-search-runtime]
    max_concurrency: 6
    output: evidence_bundle
