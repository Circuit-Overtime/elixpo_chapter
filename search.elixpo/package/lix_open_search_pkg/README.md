# lix-open-search

Python client SDK for [lixSearch](https://github.com/Circuit-Overtime/lixSearch) — a multi-tool AI search engine with web search, video, images, deep research, and RAG-augmented synthesis.

```bash
pip install lix-open-search
```

## Quick Start

```python
from lix_open_search import LixSearch

lix = LixSearch("http://localhost:9002")

# One-shot search
result = lix.search("quantum computing breakthroughs 2026")
print(result.content)

# Streaming
for chunk in lix.search_stream("latest AI papers"):
    print(chunk.content, end="", flush=True)

# Multi-turn
result = lix.chat([
    {"role": "user", "content": "Compare Tesla and BYD sales"}
], session_id="my-session")

# Multimodal
result = lix.search("What is this?", images=["https://example.com/photo.jpg"])

# Raw URLs (no LLM)
urls = lix.surf("best Python frameworks", limit=10)
```

## Async

```python
from lix_open_search import AsyncLixSearch

async with AsyncLixSearch("http://localhost:9002") as lix:
    result = await lix.search("SpaceX updates")
    async for chunk in lix.search_stream("latest AI papers"):
        print(chunk.content, end="", flush=True)
```

## OpenAI Compatibility

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:9002/v1", api_key="unused")
response = client.chat.completions.create(
    model="lixsearch",
    messages=[{"role": "user", "content": "latest AI news"}],
    stream=True,
)
```

## API Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `search(query, session_id=, images=)` | `SearchResult` | Search with LLM synthesis |
| `search_stream(query, ...)` | `Iterator[StreamChunk]` | Streaming search |
| `chat(messages, session_id=, stream=)` | `SearchResult` | Multi-turn conversation |
| `surf(query, limit=5, images=False)` | `SurfResult` | Raw URLs, no LLM |
| `create_session(query)` | `Session` | Create persistent session |
| `get_history(session_id)` | `list[Message]` | Get conversation history |
| `delete_session(session_id)` | `None` | Delete a session |
| `health()` | `dict` | Health check |

## Self-Host with Docker

```bash
docker pull elixpo/lixsearch
docker compose -f package/lix_open_search_pkg/docker-compose.yml up -d
curl http://localhost:9002/api/health
```

## License

MIT
