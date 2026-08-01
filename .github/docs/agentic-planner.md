# Elixpo repository agent

## Workflows

- `elixpo-agent.yml` owns every scoped `@elixpoo` invocation from issues and pull requests.
- `elixpo-triage.yml` classifies new issues and pull requests, applies category, priority, and task-type metadata, and files the item on the matching Project V2 board.
- `artifact-update.yml` builds the repository snapshot consumed at the start of each run.
- `on-merge.yml` maintains the gist changelog consumed alongside that snapshot.

The retired issue and PR agent workflows must not be restored: separate listeners cause duplicate runs for issue comments attached to pull requests.

## Credential

All Pollinations calls use one GitHub Actions secret:

`ELIXPO_POLLINATIONS_API_KEY_GITHUB`

CCR creates multiple routes with that same key. No route has a separate credential.

## Cost-aware routes

| Route | Model | Use |
| --- | --- | --- |
| default | `nova-fast` | intent, metadata, questions, routine tool use |
| background | `deepseek` | repository changes only |
| think | `deepseek` | complex reasoning or review only |
| webSearch | `perplexity-fast` | time-sensitive external lookup only |

Token ceilings are centralized in `.github/ci_config.py`. The prompt directs the agent to read the prepared context once, use targeted repository reads, and avoid search unless local context is insufficient. RTK compresses supported shell output before it reaches the model.

The setup script also maps the harness's Sonnet, Opus, and Haiku aliases to these configured free models. This prevents the upstream API from receiving an unavailable Anthropic model name after CCR has selected a Pollinations provider.

## Scope and safety

- Only configured organization members can invoke the workflow.
- An issue invocation may answer, edit metadata, inspect a linked PR, update its writable branch, or open one linked PR.
- A pull-request invocation may answer, edit metadata, review, or update the existing same-repository head branch.
- Fork PRs are read-only.
- The agent cannot push `main`, force-push, merge, expose secrets, or act in another repository.
- Per-item concurrency prevents simultaneous runs from racing on one issue or pull request.
