# LixEditor developer overview

**LixEditor** is the block-based WYSIWYG editor that powers LixBlogs. It is built on BlockNote and React, includes custom blocks for images, equations, mentions, tabs, and tables of contents, and supports real-time collaboration through Yjs.

This section documents the reusable editor package. Product users looking for publishing help should start with [Write and publish](/docs/writing-publishing).

## What the package provides

- Structured `Block[]` JSON suitable for persistence and read-only rendering.
- A React component with controlled lifecycle callbacks.
- Markdown shortcuts and slash commands.
- An imperative ref API for reading or replacing blocks.
- Optional collaborative editing with a Yjs document and provider.

Continue with [Installation](/docs/installation) or the [Quick Start](/docs/quick-start).
