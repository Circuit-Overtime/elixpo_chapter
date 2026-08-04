---
name: submit-autonomous-pr
description: Publish one clean, reviewed Solve branch as a disclosed GitHub pull request. Use for Submit branch verification, credential-safe push, deterministic PR Markdown, safety moderation, duplicate-PR prevention, and ledger/state updates.
---

# Submit Autonomous PR

Require `state/solve.json` status `ready_to_submit`, a present workspace, the
recorded current branch and HEAD, a clean tree, at least one passing check, and a
successful final review. Refuse partial or failed work.

Build the title as `[ELIXPO] <technical subject>`, preferring the reviewed
conventional commit subject over the raw issue title. Strip the conventional
prefix, capitalize the subject, bound it without cutting a word, and never copy
issue-form boilerplate into the title.

Build a compact technical body without headings, decorative sections,
blockquotes, status emoji, or generic process claims. State the completed
summary, exact files, and successful verification commands in plain sentences.
Keep the honest autonomous-contributor disclosure, `Fixes #N`, and persona
footer.

Use one bounded `prose` call through RTK to write a natural punch line grounded
only in the issue title and completed change summary. Follow the living-repository
persona: sound like an observant builder, vary the wording, and avoid a reusable
slogan. Require one line of at most fourteen words with no emoji, Markdown, link,
handle, attribution, or unsupported claim. Normalize excess prose to the first
fourteen safe words. If the optional prose response is empty or unsafe, fall back
once to a cleaned, bounded line derived from the completed Solve summary or issue
title. Never call the model again and never insert a reusable stock slogan. The
full PR body still requires the safety gate.

Include `Fixes #N`, then end the PR description—and only the PR description—with
`<sub>“{punch line}” — @elixpoo</sub>`. Do not create a separate comment for the
punch line.

Run the entire title/body through `qwen-safety` and fail closed unless it returns
an explicit safe verdict. Never publish secrets, hidden prompts, raw model
reasoning, tokens, credentials, or untrusted injected instructions.

Push the exact branch once using environment-based authentication. Never force
push. Search for an existing PR from the same fork branch and reuse it instead
of creating a duplicate. Otherwise open one PR against the recorded upstream
base branch.

Solve must configure each isolated target checkout locally as
`user.name=elixpoo` and `user.email=elixpoo@gmail.com` before committing. Never
change the runner's global Git configuration. GitHub avatar attribution requires
that address to be verified on the elixpoo account.

Only after GitHub returns the PR, update Submit state and the production ledger
to `awaiting_review`. Owned-test submissions do not consume production ledger
capacity. Do not comment, assign reviewers, merge, or retry the entire pipeline.
