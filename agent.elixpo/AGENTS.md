# Agent Guidelines for agent.elixpo

**elixpoo** — an autonomous GitHub-contributor agent. It picks up community issues, forks, solves, opens PRs, and shepherds them to merge. Built as **independent squads**, each a standalone Python module run as a GitHub Actions workflow. The full design lives in [docs/refactor_plan.md](docs/refactor_plan.md).

## Architecture

- **Runtime**: GitHub Actions today (each squad = one workflow → `python -m agents.<squad>`). **Runtime-agnostic** — squads assume nothing about Actions, so execution can lift to Cloudflare compute later with zero code change.
- **Language**: Python ≥3.11 (agent system) · TypeScript/Next.js 16 (frontend).
- **Models**: Pollinations OpenAI-compatible API (`https://gen.pollinations.ai/v1`). Roles → models mapped in [config/models.yaml](config/models.yaml); see [docs/pollinations.md](docs/pollinations.md) and [docs/model.txt](docs/model.txt).
- **State**: **No database.** Durable state = GitHub issues + a Project V2 kanban. Ephemeral cross-workflow state = committed-back JSON in `state/`. The control repo *is* the system of record.
- **Hosting**: frontend → **Cloudflare Pages**. Webhook ingress → thin Cloudflare Worker → `repository_dispatch`.
- **Secrets**: all in `.env.local` (gitignored; tracked `.env` is the SOPS-encrypted copy). Loaded by `lib/config.py`.

## Repository Structure

- `agents/` — the squads (scout, triage, pick, comprehend, solve, submit, steward). **Independent: a squad never imports another squad.** They talk only via GitHub + `state/`. `comprehend/` is a library used by `solve/`.
- `rtk/` — the token economy over Pollinations: `router` (role→model), `budget`, `cache`, `count`, `compress`, `dedup`, `diff_context`, `retrieve`, `summarize`, `downshift`, `truncate`, `shell` (pipes runner output through the `rtk` CLI), `ledger`.
- `lib/` — shared plumbing: `github/` (App auth + REST + `dispatch`), `tools/` (file/git/shell/grep/glob/web — publishable as our own MCP/connector later), `state/` (issues + board + json store), `scorer.py`, `config.py`.
- `config/` — `models.yaml`, `languages.yaml`, `budgets.yaml`. `state/` — `ledger.json`, `candidates.json`, `blocklist.json`, `token_log.jsonl`. `prompts/` — squad prompt templates.
- `.github/workflows/` — squad workflows + home-repo CI/automation. `.github/scripts/` — home-repo issue/PR automation.
- `agent.elixpo/` — Next.js frontend. `public/agent.elixpo.png` — 1024² brand master. `workers/` — webhook-ingress Worker.

## Hard Constraints

- **Squad independence**: code in `agents/<x>/` may import `rtk` and `lib`, never `agents/<y>/`.
- **No external DB**: never reach for D1/KV/Postgres. State is issues + board + `state/*.json`.
- **Every model call goes through `rtk.Router`** — never call Pollinations directly (budget + ledger + caching depend on it).
- **Safety gate before any public post**: route through the `qwen-safety` role.
- **Honest disclosure**: PRs/comments post as `elixpoo[bot]` and say they're from an autonomous contributor.
- **Publishable design**: build tools/connectors so they can ship as a pypi/npm package later — keep modules dependency-light and interface-clean.
- **Latest agentic techniques**: structured outputs (JSON schema tool calls), plan→implement→self-review loops, model escalation (qwen-coder-large → claude after 2 failures), retrieval over re-sending context.

## Git & PR Workflow

- **Never commit to `main`.** It's branch-protected; use a feature branch.
- Branch naming: `elixpo/<issue-n>-<hex>` for agent-driven changes; `feat/<slug>` / `fix/<slug>` for manual.
- Commit format: conventional — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`.
- PR title: `[ELIXPO] <short>` for agent PRs.
- PR body ends with `Fixes #N` so GitHub auto-closes on merge.

## Communication Style

- Bullets over paragraphs. <200 words per PR body / comment unless the change genuinely needs more.
- Facts, not opinions. Link specific files/lines rather than describing.
- No marketing language ("seamlessly", "robust", "leverages").
- No hedging ("I think", "maybe").

## Agent Voice

- Never say "Claude", "Claude Code", "AI", "LLM", "analyzing".
- Speak as a teammate: "looking into this", "pushed a fix", "opened #N".

## Workflow Orchestration (for agents)

- Read `.elixpo-context/context.md` ONCE at the start if injected into the prompt; otherwise use `Glob`/`Grep` to locate files directly. Don't `ls -R`.
- For issue work, follow `.claude/commands/respond-to-issue.md` — question vs implement vs decline.
- For commit / push / PR, follow `.claude/commands/commit-push-pr.md`.
- For mechanical bulk refactors (>3 files, renames, string migrations), use `python .github/scripts/apply_refactor.py` with a JSON plan on stdin — one deterministic call beats N Read+Edit roundtrips.

## Common Mistakes (fill in as you discover them)

<!-- TODO: Track mistakes contributors / agents have actually made in this
     repo so future passes avoid them. Keep concrete and specific. -->
