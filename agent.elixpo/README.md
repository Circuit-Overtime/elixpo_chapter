<!--
  ELIXPO README - follows the canonical Elixpo template (STANDARDS.md §4).
  Product-specific sections (the agent design, Layout, docs) are preserved
  under "About" and "How it works".
-->

<p align="center">
  <img src="public/agent.elixpo.png" alt="elixpoo - the autonomous Elixpo contributor agent" width="100%" />
</p>

<h1 align="center">elixpoo</h1>

<p align="center">
  <strong>The autonomous GitHub-contributor agent of the Elixpo ecosystem.</strong><br/>
  Free and open source, built by a global community of 45+ contributors.
</p>

<p align="center">
  <a href="https://elixpo.com">Website</a> ·
  <a href="https://github.com/orgs/elixpo/discussions">Discussions</a> ·
  <a href="https://github.com/elixpo/elixpo_chapter">Monorepo</a> ·
  <a href="https://github.com/sponsors/Circuit-Overtime">Sponsor</a>
</p>

---

## About

**elixpoo** (`@elixpoo`) is an autonomous GitHub-contributor agent. Its complete
Scout → merge contribution lifecycle is named **OreoFlow**. OreoFlow picks up
community issues, forks, solves them, opens PRs, and shepherds those PRs to
merge. It is built as **independent squads**, each a standalone Python module run as
a GitHub Actions workflow (runtime-agnostic: liftable to Cloudflare compute).
There is no server and no database — state lives in GitHub issues, a Project
board, and `state/*.json`. It runs in CI, not as a hosted website.

> This repository is the source for the **elixpoo** agent.

See **[AGENTS.md](AGENTS.md)** for the operating manual and
[docs/refactor_plan.md](docs/refactor_plan.md) for the full design.

### Layout

| Path | Purpose |
|------|---------|
| `agents/` | independent OreoFlow, repository response, operations, and synchronization squads |
| `rtk/` | the token economy over Pollinations (router, budget, cache, ledger, shrinkers) |
| `lib/` | shared plumbing: github, tools, state (issues + board + json), scorer, config |
| `config/` | `models.yaml` (role→model), `languages.yaml`, `budgets.yaml` |
| `state/` | committed-back JSON ledgers |
| `prompts/` | squad prompt templates |
| `agent.elixpo/` | Next.js frontend (Cloudflare Pages) |
| `workers/` | stateless signed-webhook ingress; no D1/KV agent state |

### Develop

```bash
uv pip install -e ".[dev]"     # into venv/
cp .env.example .env.local     # fill in secrets
pytest                         # every squad is individually testable
python -m agents.scout         # run one squad
```

### Manual Solve test

The controlled implementation target is
[`elixpo/lixrl.com#9`](https://github.com/elixpo/lixrl.com/issues/9). It is
assigned, so test it through the explicit owned-repository boundary:

Solve and Submit exclusively use `AGENT_GITHUB_SOLVER_TOKEN`. For public
cross-owner contributions, use a classic PAT owned by the fork account with
the `public_repo` scope. Other squads continue using
`ELIXPOO_GITHUB_AGENTIC_TOKEN`.

```bash
python -m agents.vet \
  https://github.com/elixpo/lixrl.com/issues/9 \
  --owned-test --force

python -m agents.solve \
  --issue-url https://github.com/elixpo/lixrl.com/issues/9 \
  --owned-test

python -m json.tool state/solve.json
```

Solve creates/reuses the authenticated fork, checks out a fresh issue branch,
loads only relevant source and guidance, applies exact edits, runs bounded checks,
commits locally, and stops at `ready_to_submit`. Inspect the state and fork
workspace before publishing:

```bash
python -m agents.submit
python -m json.tool state/submit.json
```

Submit pushes the reviewed branch and opens the disclosed PR. Set
`ELIXPO_GITHUB_FORK_OWNER` only when the fork should belong to an account other
than the PAT owner. The target checks receive a minimal environment without the
GitHub or Pollinations credentials.

## The ecosystem

| Tool | What it does | Link |
| --- | --- | --- |
| 🎨 **Elixpo Art** | AI image generation _(under dev)_ | [art.elixpo.com](https://elixpo.com) |
| ✍️ **Elixpo Blogs** | A rich, modern writing and publishing space | [blogs.elixpo.com](https://blogs.elixpo.com) |
| 🖊️ **LixSketch** | A hand-drawn style whiteboard for ideas and diagrams | [sketch.elixpo.com](https://sketch.elixpo.com) |
| 💬 **Elixpo Chat** | A fluid, real-time AI chat experience _(under dev)_ | [chat.elixpo.com](https://chat.elixpo.com) |
| 🔎 **Elixpo Search** | Fast, AI-assisted search | [search.elixpo.com](https://search.elixpo.com) |
| 👤 **Elixpo Accounts** | One identity (SSO) across the ecosystem | [accounts.elixpo.com](https://accounts.elixpo.com) |
| 🔗 **lixrl** | Our flagship URL shortener | [lixrl.com](https://lixrl.com) |
| 🪪 **Portfolios** | Personal pages to showcase your work | [me.elixpo.com](https://me.elixpo.com) |
| 🐼 **Oreo** | The mascot's home | [oreo.elixpo.com](https://oreo.elixpo.com) |

Developers can drop our editors into their own projects with the
**`@elixpo/lixsketch`** and **`@elixpo/lixeditor`** packages, on npm and as VS
Code extensions.

## Built by the community

Elixpo is made by people, in the open. **45+ contributors** have shaped these
tools, with a small core team steering the way:

- **Ayushman Bhattacharya** - Founder & Lead ([@Circuit-Overtime](https://github.com/Circuit-Overtime))
- **Vivek Yadav** - Lead Co-Dev ([@ez-vivek](https://github.com/ez-vivek))
- **Anwesha Chakraborty** - Core Maintainer ([@anwe-ch](https://github.com/anwe-ch))

Everyone is welcome. See **[CONTRIBUTING.md](CONTRIBUTING.md)** and our
**[Code of Conduct](CODE_OF_CONDUCT.md)**.

## Recognition & programs

Elixpo has taken part in and been supported by **GSSOC**, **Hacktoberfest**,
**Pollinations.AI**, **MS Startup Foundations**, and **OSCI**.

## Get involved

- 💬 **Join the conversation** in [GitHub Discussions](https://github.com/orgs/elixpo/discussions).
- 🚀 **Submit your project** to be featured across the ecosystem.
- 🛠️ **Contribute** - browse good first issues in the [monorepo](https://github.com/elixpo/elixpo_chapter).
- ❤️ **Support us** via [GitHub Sponsors](https://github.com/sponsors/Circuit-Overtime).

## Brand assets

The brand master for this agent lives at
[`public/agent.elixpo.png`](public/agent.elixpo.png). The brand source of truth
(mascot, palette, rules) and a browsable kit are at
**[elixpo.com/assets](https://elixpo.com/assets)**.

## License

Elixpo uses one **licensing standard** across every repository:

- **Code** - [MIT](LICENSES/preferred/MIT) (with the [Oreo-trademarks exception](LICENSES/exceptions/Oreo-trademarks)).
- **Brand & visual assets** - [CC-BY-4.0](LICENSES/preferred/CC-BY-4.0) (with the same exception).

The Oreo mascot, the chest E-badge, and the "Elixpo" and "Oreo" names, domains,
and palette are reserved - this protects the brand and its royalties while
keeping the code and assets free. See [`LICENSE`](LICENSE) and the per-product
notice board, [`NOTICE`](LICENSES/NOTICE).

## Exclusive

> Per-repo "exclusive" artifacts (an npm package, a VS Code extension, a hosted
> SaaS, a paid tier) are declared here and in [`NOTICE`](LICENSES/NOTICE).

**This repository:** None - it is the agent source and runs in CI.

---

<p align="center">
  <sub>Made in the open, together. © 2023-2026 Elixpo.</sub>
</p>
