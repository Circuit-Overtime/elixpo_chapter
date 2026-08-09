# Agent secrets and variables setup

Use organization-level Actions secrets with visibility limited to
`elixpo/agent.elixpo` and the repositories that install the OreoFlow workflow
bundle. Never commit token values, paste them into logs, or pass them into the
Solve target sandbox.

## Required Actions secrets

- [ ] `ELIXPO_POLLINATIONS_API_KEY`
  - Pollinations text API key used by every RTK and CCR model route.
  - This is the only model-provider credential; do not create model-specific
    secrets.

- [ ] `ELIXPOO_GITHUB_AGENTIC_TOKEN`
  - Owner: the `elixpoo` user account.
  - Recommended type: fine-grained PAT.
  - Resource owner: `elixpo`.
  - Repository access: every repository using the agent workflows.
  - Repository permissions: Actions read/write, Contents read/write, Issues
    read/write, Pull requests read/write, Variables read/write, Workflows
    read/write, and Metadata read.
  - Organization permission: Projects read/write.
  - The account must be able to read participating notifications for Steward.
  - Classic fallback scopes: `repo`, `workflow`, and `project`; add `read:org`
    only when organization policy requires it.

- [ ] `AGENT_GITHUB_SOLVER_TOKEN`
  - Owner: the account that owns contribution forks, normally `elixpoo`.
  - Recommended type for public targets: classic PAT with `public_repo`.
  - Used only for fork creation, Solve branches, pushes, and PR submission.
  - Add private repository access only if private targets are intentionally
    enabled.

- [ ] `ELIXPOO_GIST_AGENTIC_TOKEN`
  - Owner: `elixpoo`.
  - Classic PAT scope: `gist` only.
  - Used for follow-up memory, cursors, caches, and merge changelogs.

- [ ] `ELIXPOO_GITHUB_DISCUSSIONS_TOKEN`
  - Give access to `elixpo/agent.elixpo` and `elixpo/elixpo`.
  - Repository permissions: Discussions read/write, Issues read/write, Pull
    requests read, Contents read, and Metadata read.
  - Issues write is required for automatic Discussion labels.

- [ ] `ELIXPOO_GITHUB_PROJECT_TOKEN`
  - Owner: `elixpoo`.
  - Read access to public Issues and Pull requests.
  - Read/write access to the selected GitHub Project V2.
  - Keep this separate from unrelated workflows.

GitHub supplies `GITHUB_TOKEN` automatically during Actions runs. Do not create
or copy it as an organization secret.

## Required Actions variables

- [ ] `ELIXPOO_FOLLOWUP_GIST_ID=<private-gist-id>`
- [ ] `ELIXPO_GITHUB_CONTROL_REPO=elixpo/agent.elixpo`
- [ ] `ELIXPO_GITHUB_PROJECT_OWNER=<project-owner-login>`
- [ ] `ELIXPO_GITHUB_PROJECT_NUMBER=<project-number>`
- [ ] `ELIXPO_MENTION_TRUSTED_USERS=<comma-separated-logins>`
- [ ] `ELIXPO_MENTION_TRUSTED_ORGS=elixpo`
- [ ] `ELIXPO_MENTION_WATCHED_REPOS=<comma-separated-owner/repository-names>`
- [ ] `OREOFLOW_RUNTIME_REF=<reviewed-release-tag>`

Create the Project and obtain its number with:

```bash
python -m agents.project --setup
python -m json.tool state/project_setup.json
```

## Optional Actions variables

- [ ] `ELIXPO_GITHUB_FORK_OWNER=elixpoo`
- [ ] `ELIXPO_FOLLOWUP_TTL_DAYS=360`
- [ ] `ELIXPO_JANITOR_ORPHAN_TTL_HOURS=24`
- [ ] `OREOFLOW_SYNC_CONCURRENCY=4`
- [ ] `ELIXPO_STEWARD_CELEBRATE=false`
- [ ] `CI_GIST_ID=<merge-changelog-gist-id>`
  - May remain unset initially; `on-merge.yml` creates and persists it.

## Optional webhook Worker secrets

These belong in Cloudflare Worker secrets, not GitHub Actions secrets:

- [ ] `GITHUB_WEBHOOK_SECRET`
  - Must exactly match the secret configured on the GitHub webhook.
- [ ] `GITHUB_CONTROL_TOKEN`
  - Token used only to dispatch verified events to the control repository.

Set them with `wrangler secret put`; never place their values in Worker
configuration files.

## Verification checklist

- [ ] Confirm secret names without printing values:

  ```bash
  gh secret list --repo elixpo/agent.elixpo
  gh variable list --repo elixpo/agent.elixpo
  ```

- [ ] Run the token policy audit:

  ```bash
  python .github/scripts/audit_tokens.py
  ```

- [ ] Verify Discussion categories and label access:

  ```bash
  python -m agents.discussions verify-config
  ```

- [ ] Verify Project access without updating fields:

  ```bash
  python -m agents.project --dry-run
  ```

- [ ] Verify organization workflow drift without opening PRs:

  ```bash
  python -m agents.standard_sync --concurrency 4
  ```

- [ ] Run one owned Vet → Solve → Submit test and confirm Steward, Doctor,
  Janitor, Project, and Gist receipts converge.

## Do not create

- [ ] Do not create `GH_SECRET`; it is not used.
- [ ] Do not create legacy `GIST_TOKEN` or `POLLINATIONS_KEY` secrets for the
  current workflow bundle.
- [ ] Do not create per-model API keys.
- [ ] Do not expose deployment, package-publishing, payment, moderation, SOPS,
  or age credentials to agent workflows.

