# Discussions squad

`agents.discussions` gives the repository a deterministic activity loop:

- merged diffs → an energized/alert announcement, curious poll, mentoring Q&A,
  or a resting no-post decision;
- 30-minute pulse → recompute mood from unhandled merges, with a six-hour posting
  cooldown so activity stays visible without becoming noisy;
- weekly schedule → one MLOps, GitOps, Docker, or Kubernetes Q&A;
- `@elixpoo` in a discussion or discussion comment → contextual reply.

Generated Discussions are published to `elixpo/elixpo`, which must be configured
as the source repository for organization Discussions. Merge evidence still comes
from the repository that emitted the pull-request event.

Every generation uses the `discussions` RTK role (`nova-fast`, the lowest-priced
general text model in the checked-in Pollinations registry). Every title/body or
reply is then sent through the `safety` role before it can be posted. Posts carry
an autonomous-contributor disclosure and an idempotency marker.

The model never chooses the mood or genre. `agents.discussions.mood` scores
changelogs, breaking/security language, feature paths, design signals,
configuration surfaces, domain files, documentation, diff size, and
maintenance-only changes. It returns one of `alert`, `energized`, `curious`,
`mentoring`, or `resting`. Only then does the routed writer compose structured
fields for the selected genre.

Python renders those fields into fixed Markdown sections and prefixes exactly one
mood emoji: 🚨 alert, 🚀 energized, 🗳️ curious, 🧭 mentoring, or 🧠 scheduled Q&A.

Runtime behavior is defined by the repo-owned skills in `skills/`:

- `merge-discussion-orchestrator` — evidence ranking and announce/poll/skip rules;
- `living-repo-persona` — stable teammate voice for every supplied mood;
- `technical-qna-host` — domain selection, scenario quality, and duplicate avoidance;
- `discussion-mention-responder` — grounded answers and prompt-injection boundaries;
- `github-discussion-publisher` — categories, identity, moderation, and idempotency.

The squad loads the relevant complete `SKILL.md` into each model call. The Python
publisher independently enforces the safety, disclosure, and duplicate checks.

## Repository setup

1. Enable GitHub Discussions.
2. Create categories named `Announcement` (or `Announcements`), `Q&A` (or
   `QNA`), and `Polls` in `elixpo/elixpo`.
3. Give `ELIXPOO_GITHUB_DISCUSSIONS_TOKEN` access to both `elixpo/agent.elixpo`
   and `elixpo/elixpo`, with Discussions and Issues read/write plus Pull requests
   read. Issues write is required to create and attach labels.
4. Add the Actions secret `ELIXPO_POLLINATIONS_API_KEY`. This is the only model
   provider key used by the squad.

The workflow recomputes mood at minute 13 and 43 of each hour, runs Q&A each
Wednesday at 09:17 UTC, and exposes both through `workflow_dispatch`. The mood
pulse looks back 48 hours, aggregates up to five unhandled merges, and publishes
at most once per six hours unless the heuristic detects an alert.
`ELIXPO_DISCUSSIONS_REPOSITORY` defaults to `elixpo/elixpo` and can override the
destination for local testing.

Because Discussion events originate in `elixpo/elixpo` while this workflow lives
in `agent.elixpo`, a ten-minute schedule scans the last 24 hours for exact,
unhandled `@elixpoo` mentions. It makes no model call when no eligible mention is
present and replies to at most five mentions per run. Run the `poll-mentions`
workflow-dispatch option to test this path immediately.

The publisher creates missing labels and attaches `announcement`, `qna`, or
`poll`, the primary domain (`mlops`, `gitops`, `docker`, or `kubernetes`) when
applicable, the current mood label, and `elixpoo-generated`.

GitHub's public GraphQL API does not expose native poll-option creation. Poll
discussions therefore publish numbered options and collect votes plus reasoning
in replies.

## Local event replay

Set `GITHUB_EVENT_PATH` to a saved webhook payload, then run one mode:

```bash
python -m agents.discussions merge
python -m agents.discussions qna
python -m agents.discussions respond
python -m agents.discussions pulse
```
