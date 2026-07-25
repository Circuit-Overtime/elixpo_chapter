---
name: export-documents
description: Prepare and export lixSearch answers as polished PDF documents. Use only when a user explicitly asks to create, save, download, or export content as a PDF.
---

# Export Documents

Export completed content without repeating research.

## Workflow

1. Accept finalized Markdown and an optional title.
2. Ensure content is non-empty and remove internal task messages.
3. Preserve headings, lists, links, citations, and code blocks.
4. Call `export_to_pdf` once.
5. Return the download URL unchanged.

## Guardrails

- Depend on synthesis when content is not finalized.
- Do not invent citations or expand source content.
- Do not export without explicit user intent.
- Preserve the text response if export fails.

## Runtime contract

    agent: document
    tools: [export_to_pdf]
    timeout_seconds: 20
    max_concurrency: 1
    depends_on: [synthesize-answer]
    output: document_bundle
