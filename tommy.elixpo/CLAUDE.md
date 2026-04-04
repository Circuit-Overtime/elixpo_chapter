# Tommy

Tommy is a Discord-to-GitHub orchestrator bot. It enables users to interact with GitHub repositories directly from Discord, including code scanning, security analysis, project management, PR author assignment, and issue tracking.

## Configuration Hierarchy

Three config files, each with a distinct role. **No values are duplicated across them.**

| File | Scope | What it controls |
|------|-------|-----------------|
| `config.json` | **Bot runtime** (Python) | Bot name, default repo, admin users, Discord role IDs, whitelisted repos, AI model, webhook/API ports, embedding settings |
| `.github/tommy.yml` | **CI/CD pipelines** (GitHub Actions) | Trigger phrase, system prompt for CI, GitHub secret names, AI API endpoints/models, router config, image generation, project manager labels |
| `.env` | **Secrets only** | Tokens, API keys, private keys — never committed |

### Where each setting lives (single source of truth)

- **Bot name** → `config.json` → `bot.name` (CI reads it from config.json at runtime)
- **Admin users / whitelist** → `config.json` → `github.admin_users` (CI reads it from config.json at runtime)
- **Trigger phrase** → `.github/tommy.yml` → `bot.trigger_phrase` (CI-only concept)
- **AI models for CI** → `.github/tommy.yml` → `ai.models.*`
- **AI model for Discord bot** → `config.json` → `ai.model`
- **Embedding provider** → `config.json` → `embeddings.*`
- **System prompt (Discord bot)** → `src/constants.py` → `BASE_SYSTEM_PROMPT` + addons
- **System prompt (CI workflows)** → `.github/tommy.yml` → `bot.system_prompt`
- **Platform knowledge** → `src/context/repo_info.txt` (injected into Discord bot prompt as `{repo_info}`)

## Project Structure

- `src/bot.py` — Main Discord bot (TommyBot extends commands.Bot)
- `src/config.py` — Loads `config.json` + `.env`, exposes `config` singleton
- `src/constants.py` — Tool definitions, system prompts (BASE + DISCORD_ADDON + API_ADDON)
- `src/context/repo_info.txt` — Embedded platform knowledge (customize per-org)
- `src/api/tommy_api.py` — OpenAI-compatible REST API
- `src/services/` — Core services (AI client, GitHub, embeddings, webhooks, code agent)
- `.github/tommy.yml` — CI master config
- `.github/scripts/ci_config.py` — Python loader for CI config
- `.github/scripts/` — CI scripts (PR review, realtime publishing, project manager)
- `.github/workflows/` — GitHub Actions workflow definitions

## Embeddings

Configured in `config.json` under `"embeddings"`. Two modes:

- **`"provider": "api"`** — Any OpenAI-compatible embedding API. Set `model`, `api_base_url` in config.json, and `EMBEDDINGS_API_KEY` in `.env`.
- **`"provider": "local"`** — sentence_transformers model on the host machine. Set `model` to a HuggingFace ID or path.

All embedding subsystems (code, docs, session) share the same provider via `src/services/embeddings_utils.py`.

## CI Pipelines

Configured via `.github/tommy.yml`. Workflows read it at runtime via `yq`/`jq`.

- `pr-issue-assist.yml` — AI assistant triggered by mentioning the bot in issues/PRs
- `pr-review.yml` — AI code review on PRs
- `autofix.yml` — When an issue gets the configured label (default: `tommy`), AI reads the codebase, fixes the bug, and opens a PR. Config in `tommy.yml` → `autofix`.
- `pr-assign-author.yml` — Auto-assigns PR author
- `project-manager.yml` — AI-powered issue/PR triage and labeling

## Adopting Tommy for a New Org

1. Fork this repo
2. Edit `config.json` — set bot name, default repo, admin users
3. Edit `.github/tommy.yml` — set trigger phrase, AI endpoints, secret names
4. Edit `src/context/repo_info.txt` — add your project's platform knowledge
5. Set GitHub secrets as configured in `.github/tommy.yml` → `github.secrets.*`
6. Set `.env` secrets for the Discord bot runtime

## Development

- Python 3.10+
- Discord.py for bot framework
- FastAPI for the HTTP API
- Docker for sandboxed code execution
