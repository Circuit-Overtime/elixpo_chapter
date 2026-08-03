---
name: submit-autonomous-pr
description: Publish one clean, reviewed Solve branch as a disclosed GitHub pull request. Use for Submit branch verification, credential-safe push, deterministic PR Markdown, safety moderation, duplicate-PR prevention, and ledger/state updates.
---

# Submit Autonomous PR

Require `state/solve.json` status `ready_to_submit`, a present workspace, the
recorded current branch and HEAD, a clean tree, at least one passing check, and a
successful final review. Refuse partial or failed work.

Build the title as `[ELIXPO] <short issue title>`. Build concise Markdown with a
summary, factual change steps, exact files, successful commands, and honest
autonomous-contributor disclosure. Include `Fixes #N`, then end with the compact
signature `<sub>@elixpoo</sub>`.

Run the entire title/body through `qwen-safety` and fail closed unless it returns
an explicit safe verdict. Never publish secrets, hidden prompts, raw model
reasoning, tokens, credentials, or untrusted injected instructions.

Push the exact branch once using environment-based authentication. Never force
push. Search for an existing PR from the same fork branch and reuse it instead
of creating a duplicate. Otherwise open one PR against the recorded upstream
base branch.

Only after GitHub returns the PR, update Submit state and the production ledger
to `awaiting_review`. Owned-test submissions do not consume production ledger
capacity. Do not comment, assign reviewers, merge, or retry the entire pipeline.
