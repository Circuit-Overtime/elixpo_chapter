---
name: research-web
description: Find, fetch, and verify current web information for lixSearch. Use for live facts, news, prices, comparisons, source-backed questions, URL reading, local-time lookups, and complex investigations requiring multiple subtopics.
---

# Research Web

Search efficiently and return compact evidence with source URLs.

## Workflow

1. Use `web_search` with the narrowest useful query and depth.
2. For latest, current, today, or news requests, include the current date or recency in the query and treat search snippets only as leads.
3. Deduplicate and rank URLs before fetching. Reject app directories, ad pages, scraped profiles, undated pages, and off-topic results.
4. Run independent `fetch_full_text` calls concurrently. A current-information answer requires fetched evidence from at least two credible sources when available.
5. Prefer primary and authoritative sources, then reputable reporting. Capture publication dates for news.
6. Record claims with supporting URLs; never invent missing evidence.
7. Preserve requested coverage. For a bounded range such as N days, gather evidence for every item in the range; do not treat a start/end date or one representative item as complete coverage.
8. Use `deep_research` only when the request requires a genuinely multi-part investigation.
9. Use `get_local_time` only for location-specific time questions.

## Performance rules

- Start fetching as search results arrive.
- Default to `standard`; use `quick` for lookups and `thorough` only when necessary.
- Stop after sufficient high-quality evidence is collected.
- Never use semantic memory or an older cached answer as evidence for a freshness-sensitive claim.
- Reuse request-level cached work.
- Return evidence to synthesis instead of writing a second full answer.

## Runtime contract

    agent: research
    tools: [web_search, fetch_full_text, get_local_time, deep_research]
    timeout_seconds: 20
    depends_on: [optimize-search-runtime]
    max_concurrency: 6
    output: evidence_bundle
