# Discussions squad

`agents.discussions` manages three GitHub Discussion flows as `elixpoo`:

- merged PR → announcement, future-facing poll, or no post;
- weekly schedule → one MLOps, GitOps, Docker, or Kubernetes Q&A;
- `@elixpoo` in a discussion or discussion comment → contextual reply.

Every generation uses the `discussions` RTK role (`nova-fast`, the lowest-priced
general text model in the checked-in Pollinations registry). Every title/body or
reply is then sent through the `safety` role before it can be posted. Posts carry
an autonomous-contributor disclosure and an idempotency marker.

Runtime behavior is defined by the repo-owned skills in `skills/`:

- `merge-discussion-orchestrator` — evidence ranking and announce/poll/skip rules;
- `technical-qna-host` — domain selection, scenario quality, and duplicate avoidance;
- `discussion-mention-responder` — grounded answers and prompt-injection boundaries;
- `github-discussion-publisher` — categories, identity, moderation, and idempotency.

The squad loads the relevant complete `SKILL.md` into each model call. The Python
publisher independently enforces the safety, disclosure, and duplicate checks.

## Repository setup

1. Enable GitHub Discussions.
2. Create categories named `Announcement` (or `Announcements`), `Q&A` (or
   `QNA`), and `Polls`.
3. Give the token stored as `CI_AGENT_TOKEN` Discussions write access. Use an
   elixpoo-owned token so posts have the intended identity.
4. Add the Actions secret `ELIXPO_POLLINATIONS_API_KEY`. This is the only model
   provider key used by the squad.

The workflow runs Q&A each Wednesday at 09:17 UTC and can also be started with
`workflow_dispatch`. Set `ELIXPO_DISCUSSIONS_REPOSITORY=owner/name` to target a
different repository when running locally.

GitHub's public GraphQL API does not expose native poll-option creation. Poll
discussions therefore publish numbered options and collect votes plus reasoning
in replies.

## Local event replay

Set `GITHUB_EVENT_PATH` to a saved webhook payload, then run one mode:

```bash
python -m agents.discussions merge
python -m agents.discussions qna
python -m agents.discussions respond
```
