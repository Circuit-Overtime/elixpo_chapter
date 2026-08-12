# OreoFlow Python framework

## What is released

`agent.elixpo` publishes the Python distribution **`elixpoo`**. Applications use
its stable import namespace **`oreoflow`**. Version `v0.2.0` exposes the model
runtime used by Elixpo agents; it is not yet the complete multi-agent building
planned in [ecosystem-framework.md](ecosystem-framework.md).

```text
application agent
  ├─ owns prompts, skills, tool execution, sessions, memory and orchestration
  └─ oreoflow public API
       └─ rtk implementation
            └─ OpenAI-compatible /chat/completions provider
```

The stable namespace prevents applications from depending directly on internal
`rtk` modules. In `v0.2.0`, it exports:

| Export | Contract |
| --- | --- |
| `Router` | Resolves a logical role to a model and performs calls/streams. |
| `Message` | OpenAI-compatible system/user/assistant/tool message model. |
| `ToolDef` | OpenAI function-tool schema. |
| `ChatCompletionResponse` | Validated non-streaming provider response. |
| `ChatCompletionChunk` | Validated streaming provider chunk. |
| `Usage` | Prompt, completion, cached and total-token accounting. |
| `Budget`, `BudgetExceeded` | Per-task in-memory soft budget and hard ceiling. |
| `TokenLedger` | Optional append-only JSONL usage ledger. |
| `LLMClient` | Low-level async OpenAI-compatible chat client. |
| `Effort` | `low`, `medium`, or `high`; maps to temperature. |
| `RoleNotFound` | Raised when a requested role is absent. |
| `load_models_config` | Loads a role/model YAML document. |

`rtk` remains importable for the agent repository itself, but it is not the
application compatibility boundary.

## Installation

Released tag:

```bash
python -m pip install \
  "git+https://github.com/elixpo/agent.elixpo.git@v0.2.0"
```

Sibling development checkout:

```bash
python -m pip install -e ../agent.elixpo
```

Docker can supply the repository as a named BuildKit context and install its
wheel from that context. This is how `search.elixpo` currently consumes it.

## Configuration

The framework requires an explicit models dictionary and API key. It never
searches application environment files by itself.

```yaml
base_url: https://gen.pollinations.ai/v1
defaults:
  effort: low
roles:
  classify: {model: nova-fast}
  code: {model: qwen-coder}
  prose: {model: nova-fast}
```

Applications should load `POLLINATIONS_API_KEY` from their own secret system and
pass it to `Router`. Do not use the public-facing application `API_KEY` for the
provider. The two keys have separate purposes:

- `POLLINATIONS_API_KEY`: server-to-provider authorization.
- `API_KEY`: client-to-application authorization, when the application exposes an API.

## Non-streaming call

```python
import asyncio
import os

from dotenv import load_dotenv
from oreoflow import Budget, Message, Router, load_models_config

async def main() -> None:
    load_dotenv(".env.local")
    router = Router(
        task_id="example-code-1",
        models=load_models_config("config/models.yaml"),
        api_key=os.environ["POLLINATIONS_API_KEY"],
        budget=Budget("example-code-1", limit=4_000),
    )
    try:
        response = await router.call(
            "code",
            [Message(role="user", content="Write a Python URL validator")],
            effort="low",
            max_tokens=500,
        )
        print(response.choices[0].message.content)
        print(response.usage.model_dump())
    finally:
        await router.aclose()

asyncio.run(main())
```

A `Router` caches one `LLMClient` per selected model for its lifetime. Reuse a
router for related calls, and always call `aclose()` during shutdown.

## Streaming call

`Router.stream()` yields validated provider chunks as soon as they arrive. It
does not buffer or convert them to SSE; the application owns that transport
policy.

```python
async for chunk in router.stream(
    "prose",
    [Message(role="user", content="Write a two-line greeting")],
    effort="low",
    max_tokens=100,
):
    for choice in chunk.choices:
        if choice.delta.content:
            print(choice.delta.content, end="", flush=True)
```

Budget and ledger accounting occur after a stream completes. If a consumer
cancels midway, the framework closes the stream without charging an estimated
completed response.

## Function tools

`ToolDef` describes tools but OreoFlow does not execute them. The application
must inspect returned tool calls, authorize and run the function, append the
assistant/tool messages, and make the next model call.

```python
from oreoflow import ToolDef

tool = ToolDef.model_validate({
    "type": "function",
    "function": {
        "name": "lookup_weather",
        "description": "Read current weather for one city.",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
            "additionalProperties": False,
        },
    },
})
```

A role may specify `tools: false`; the router then removes supplied tools for
that role. This is used for provider-native search and safety routes.

## Budgets and ledgers

```python
from oreoflow import Budget, TokenLedger

budget = Budget("task-42", limit=10_000, kill_multiple=3)
ledger = TokenLedger("state/token_log.jsonl")
router = Router(
    "task-42", models=models, api_key=key, budget=budget, ledger=ledger
)
```

- `limit` is advisory and reported through `remaining()`.
- The hard ceiling is `limit * kill_multiple`.
- A pre-call estimate or recorded usage crossing the ceiling raises
  `BudgetExceeded`.
- `TokenLedger` writes one JSON object per completed call and may include cached
  token counts.
- Budget state is process-local. Durable/global quotas belong in the application.

`record_external_usage()` lets a supervised external harness report provider
usage into the same budget and ledger.

## Error and lifecycle behavior

- Missing roles raise `RoleNotFound` before network activity.
- Invalid effort values raise `ValueError` through the `Effort` enum.
- HTTP errors are surfaced by `httpx` after bounded retries.
- Statuses `429`, `500`, `502`, `503`, and `504` retry up to three attempts.
- Transport failures and timeouts retry with bounded exponential delays.
- Credentials are explicit constructor inputs and are never written to the ledger.
- `Router` and `LLMClient` are async resources; close them at application shutdown.

## How Search uses OreoFlow

`search.elixpo` uses the framework today:

```text
/v1/responses or CLI
  → AgentRunner
  → deterministic agent selection (or cheap decision agent)
  → SkillRegistry resolves scoped SKILL.md instructions and function schemas
  → oreoflow.Router.call() / oreoflow.Router.stream()
  → Pollinations OpenAI-compatible endpoint
```

Concrete ownership:

| Concern | Owner |
| --- | --- |
| Provider HTTP, retries and response validation | OreoFlow |
| Logical role → provider model | OreoFlow plus Search's `models.yaml` |
| Streaming provider chunks | OreoFlow |
| Per-call token budget primitives | OreoFlow |
| Agent choice and hard-coded prompt | Search `AgentRunner` |
| Skill discovery and scoped tool catalog | Search `SkillRegistry` |
| Tool implementation/execution | Search |
| OpenAI `/v1/responses` IDs and continuity | Search |
| Redis hot response chains | Search |
| Qdrant semantic memory | Search |
| Application SSE chunk buffering | Search |
| Authentication of Search clients | Nginx/Search `API_KEY` |

The production import is intentionally lazy in
`lixsearch/agentRuntime/runner.py`:

```python
from oreoflow import Message, Router, ToolDef
```

Both `AgentRunner._call()` and `AgentRunner._stream_call()` construct the router
with `POLLINATIONS_API_KEY`, use the role/model selected from Search's local
configuration, and close it in `finally`.

## What v0.2.0 does not provide

Do not treat these as implemented framework features yet:

- multi-agent scheduling, delegation, rooms/floors or A2A transport;
- a skill registry or tool executor;
- Redis/Qdrant memory and OpenAI conversation state;
- image, PDF, browser or web-search tool implementations;
- application HTTP endpoints, SSE buffering or client authentication;
- a globally shared long-lived router service across processes.

Those remain application responsibilities or roadmap items. Keeping this line
clear prevents framework code from coupling itself to Search deployment state.

## Raw verification

Dry-run role resolution requires no secret or network:

```bash
cd ~/agent.elixpo
python examples/raw_oreoflow.py --role code
```

Live non-streaming call:

```bash
python examples/raw_oreoflow.py --role code --live \
  --env-file .env.local \
  --prompt "Write a Python function that validates URLs"
```

Live streaming call:

```bash
python examples/raw_oreoflow.py --role prose --live --stream \
  --env-file .env.local \
  --prompt "Write a two-line release announcement"
```

The script loads the file passed with `--env-file` (default: the framework checkout's `.env.local`), never prints the key, uses a bounded budget, and closes the HTTP client. A consuming repository can pass its own file, for example `--env-file ../search.elixpo/.env.local`.
