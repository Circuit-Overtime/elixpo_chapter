# OreoFlow operator runbook

## Control surfaces

- `elixpo/agent.elixpo`: code, contracted state, approval issues, workflows.
- GitHub Project V2: sanitized operational status.
- Private follow-up Gist: bounded PR/mention memory and cache files.
- `elixpo/elixpo` Discussions: announcements, Q&A, polls, and exact mentions.

There is no operational database. The webhook Worker verifies and forwards
events but stores no agent state.
Its bounded in-isolate replay and rate guards are best effort; durable Gist and
workflow idempotency markers remain authoritative across regions and restarts.

## Required organization configuration

Configure selected-repository organization secrets using the exact scopes in
[agentic-planner.md](../.github/docs/agentic-planner.md). Never share the Solver,
Discussions, Project, or Gist credential with an unrelated workflow. Configure:

- `ELIXPO_MENTION_TRUSTED_USERS`
- `ELIXPO_MENTION_TRUSTED_ORGS=elixpo`
- `.github/elixpoo-whitelist.yml` with reviewed external repositories
- `ELIXPO_GITHUB_CONTROL_REPO=elixpo/agent.elixpo`
- `ELIXPOO_FOLLOWUP_GIST_ID`
- `OREOFLOW_RUNTIME_REF` after creating a reviewed release tag.

For the Worker, store `GITHUB_WEBHOOK_SECRET` and `GITHUB_CONTROL_TOKEN` with
`wrangler secret put`. Set the GitHub webhook URL to
`https://oreoflow-webhook-ingress.ayushbhatt633.workers.dev/github/webhook`,
content type `application/json`, SSL enabled,
and the same webhook secret. Keep `ALLOWED_OWNERS=elixpo` unless another owner is
explicitly approved.

The `elixpo` GitHub App owns the production webhook configuration. Its
Permissions & events settings must subscribe to Issues, Issue comments, Pull
requests, Pull request reviews, Pull request review comments, Discussions, and
Discussion comments. Scheduled Steward and Discussion polling remains the
authoritative recovery path for missed deliveries.

Deploy from `workers/` with its pinned Wrangler runtime. The configuration
declares both secrets as required, so deployment fails closed when either is
missing:

```bash
npm install
npm run deploy
curl --fail https://oreoflow-webhook-ingress.ayushbhatt633.workers.dev/health
```

## Repository rollout

GitHub requires event-triggering caller workflows to remain in each repository;
reusable workflows centralize jobs but do not centrally install event listeners.
The bundle therefore keeps small repository-owned listeners and centrally
propagates them by PR. See GitHub's documentation for
[reusable workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
and [organization workflow templates](https://docs.github.com/en/actions/how-tos/reuse-automations/create-workflow-templates).

1. Run `python -m agents.standard_sync` for a read-only organization drift report.
2. Inspect the listed repositories and files.
3. Run `python -m agents.standard_sync --apply` only when ready to open PRs.
4. Review each PR for repository-specific CI and permission differences.
5. Merge repositories in small batches and observe their first issue/PR event.

The standard never pushes a default branch. Re-running the same digest reuses
the already-open branch/PR.

## Controlled validation

1. Run token/security gates locally:
   `python .github/scripts/audit_tokens.py` and
   `pytest -q tests/test_security.py tests/test_repository_agent.py`.
2. Trigger the repository-agent workflow manually on an owned issue question.
3. Confirm the artifact contains `repository_agent.json` and `contracts.json`.
4. Request implementation and confirm it dispatches Vet without editing code.
5. Exercise the four mention authorization routes in
   [mention-authorization.md](mention-authorization.md).
6. Run one owned OreoFlow Vet → Solve → Submit test, then merge and confirm
   Steward, Janitor, Project, and the daily summary converge.
7. Send one valid signed webhook, replay its delivery ID, then send an invalid
   signature. Expect `202`, duplicate `202`, and `401` respectively.

## Failure recovery

- Provider/network failure: inspect the contracted receipt; retry only when
  Doctor authorizes it or the operation is explicitly documented as transient.
- Solve failure: run Doctor, then Janitor. Do not delete a preserved workspace.
- State boundary error: stop downstream workflows, restore the payload and its
  matching contract from one commit, or regenerate it with the owning squad.
- Gist conflict/corruption: run Gist Custodian in dry-run, inspect its receipt,
  then use `--repair --confirm-reset` only for managed files.
- Standard-sync failure: no target default branch was modified; inspect or close
  the digest branch and rerun the read-only report.
- Webhook outage: scheduled Steward and Discussion polls are the recovery path.

## Emergency stop

Disable the Scout, Solve, repository-agent, Steward, Discussion, and standard
sync workflows in GitHub Actions. Revoke the organization token and Solver token
if public mutation must stop immediately. Leave Janitor and read-only Project
reconciliation available long enough to clean recorded resources. Do not delete
contracted state during an incident.

## Token rotation

Rotate one credential at a time. Update the organization/Worker secret, run the
narrow smoke test for that credential, then revoke the old token. Run
`python .github/scripts/audit_tokens.py` after workflow changes. Never print an
API response containing headers or secret-bearing URLs.

## Blocklisting and manual cleanup

Add repository opt-outs to `state/ledger.json` through the Ledger interface;
never hand-edit only the deprecated `blocklist.json`. Janitor may remove only
resources present in a matching terminal Solve cleanup manifest. For an orphan,
run `python -m agents.janitor --audit` and inspect `state/janitor.json`.
