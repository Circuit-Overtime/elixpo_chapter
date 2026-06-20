# elixpoo

Autonomous GitHub-contributor agent. Picks up community issues, forks, solves,
opens PRs, and shepherds them to merge — built as **independent squads**, each a
standalone Python module run as a GitHub Actions workflow (runtime-agnostic:
liftable to Cloudflare compute). No server, no database — state lives in GitHub
issues, a Project board, and `state/*.json`.

See [AGENTS.md](AGENTS.md) for the operating manual and [docs/refactor_plan.md](docs/refactor_plan.md) for the full design.

## Layout

| Path | Purpose |
|------|---------|
| `agents/` | the squads (scout, triage, pick, comprehend, solve, submit, steward) — independent |
| `rtk/` | the token economy over Pollinations (router, budget, cache, ledger, shrinkers) |
| `lib/` | shared plumbing: github, tools, state (issues + board + json), scorer, config |
| `config/` | `models.yaml` (role→model), `languages.yaml`, `budgets.yaml` |
| `state/` | committed-back JSON ledgers |
| `prompts/` | squad prompt templates |
| `agent.elixpo/` | Next.js frontend (Cloudflare Pages) |

## Develop

```bash
uv pip install -e ".[dev]"     # into venv/
cp .env.example .env.local     # fill in secrets
pytest                         # every squad is individually testable
python -m agents.scout         # run one squad
```
