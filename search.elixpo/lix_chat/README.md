# lix_chat / lix_cache

Standalone multi-layer caching and session management for conversational AI. Extracted from [lixSearch](https://github.com/pollinations/lixsearch) into a reusable, pip-installable package.

Drop it into any chatbot, search assistant, or RAG pipeline to get production-grade session memory, semantic caching, and compressed disk archival out of the box.

```
pip install lix-chat
```

## What it solves

| Problem | Layer | Solution |
|---|---|---|
| "What did we just talk about?" | Session Context Window (Redis DB 2) | Rolling window of 20 messages in Redis, overflow to Huffman-compressed disk |
| "Didn't we already answer this?" | Semantic Query Cache (Redis DB 0) | Cache LLM responses keyed by embedding similarity (cosine ≥ 0.90) |
| "We already embedded this URL" | URL Embedding Cache (Redis DB 1) | Global cache of URL → embedding vector, shared across sessions |

## Architecture

```
User message arrives
│
├─ ① SessionContextWindow (Redis DB 2)
│   ├─ get_context() → last 20 messages from Redis
│   ├─ If Redis empty → load from .huff archive → re-hydrate
│   └─ Inject into LLM prompt as conversation history
│
├─ ② SemanticCacheRedis (Redis DB 0)
│   ├─ Compute query embedding vector
│   ├─ cosine_similarity(cached, new) ≥ 0.90?
│   │   ├─ HIT  → return cached response (skip LLM)
│   │   └─ MISS → continue pipeline
│   └─ After LLM: cache (embedding, response) for 5 min
│
├─ ③ URLEmbeddingCache (Redis DB 1)
│   ├─ Before embedding a URL: check Redis
│   │   ├─ HIT  → use cached vector (~0ms vs ~200ms)
│   │   └─ MISS → compute, cache for 24h
│   └─ Global (shared across all sessions)
│
└─ HybridConversationCache (backing store)
    ├─ Hot: Redis ordered list (LPUSH/RPOP, 20-msg window)
    ├─ Cold: Huffman-compressed .huff files on disk
    ├─ Overflow: oldest messages spill hot → cold
    └─ LRU daemon: idle 2h → migrate all to disk, free Redis
```

## Package structure

```
lix_chat/
├── pyproject.toml
└── lix_chat/
    ├── __init__.py              # re-exports from lix_cache
    └── lix_cache/
        ├── __init__.py          # public API
        ├── config.py            # CacheConfig dataclass
        ├── redis_pool.py        # Connection-pooled Redis factory
        ├── huffman_codec.py     # Canonical Huffman encoder/decoder
        ├── conversation_archive.py  # .huff disk persistence
        ├── hybrid_cache.py      # Redis hot + disk cold + LRU eviction
        ├── semantic_cache.py    # SemanticCacheRedis + URLEmbeddingCache
        ├── context_window.py    # SessionContextWindow (wraps hybrid_cache)
        └── coordinator.py       # CacheCoordinator (orchestrates all 3)
```

## Installation

**From PyPI** (once published):
```bash
pip install lix-chat
```

**From source:**
```bash
git clone https://github.com/pollinations/lixsearch.git
cd lixsearch/lix_chat
pip install -e .
```

**Dependencies:**

| Package | Version | Why |
|---|---|---|
| redis | ≥ 5.0 | All three cache layers |
| numpy | ≥ 1.24 | Embedding vectors, cosine similarity |
| loguru | ≥ 0.7 | Structured logging |
| lz4 (optional) | ≥ 4.0 | Alternative compression method |

## Quick start

### Full 3-layer setup

```python
from lix_chat import CacheConfig, CacheCoordinator

config = CacheConfig(
    redis_host="localhost",
    redis_port=6379,
    redis_key_prefix="mychat",
    archive_dir="./data/conversations",
)

cache = CacheCoordinator(session_id="user-abc", config=config)

# Store messages
cache.add_message_to_context("user", "What's the weather in Tokyo?")
cache.add_message_to_context("assistant", "It's 22°C and sunny.")

# Retrieve context for next LLM call
history = cache.get_context_messages()

# Check semantic cache before calling LLM
import numpy as np
query_embedding = np.random.rand(384).astype(np.float32)
cached = cache.get_semantic_response("https://weather.com", query_embedding)
if cached:
    print("Cache hit — skip LLM")
else:
    response = {"answer": "22°C and sunny", "sources": ["..."]}
    cache.cache_semantic_response("https://weather.com", query_embedding, response)
```

### Session memory only (no semantic cache)

```python
from lix_chat import HybridConversationCache, CacheConfig

config = CacheConfig(redis_host="localhost", redis_port=6379)
cache = HybridConversationCache("session-123", config=config)

cache.add_message("user", "hello")
cache.add_message("assistant", "hey there!")

messages = cache.get_context()  # last 20 from Redis

# Smart retrieval: recent + semantically relevant from disk
context = cache.smart_context(
    query="what did we talk about yesterday?",
    query_embedding=your_embedding,
    recent_k=10,
    disk_k=5,
)
# → {"recent": [...last 10...], "relevant": [...5 from disk archive...]}
```

### Disk-only (no Redis)

```python
from lix_chat import ConversationArchive

archive = ConversationArchive("./data/chats", session_ttl_days=30)

archive.append_turn("sess-1", {"role": "user", "content": "hello"})
archive.append_turn("sess-1", {"role": "assistant", "content": "hi!"})

turns = archive.load_all("sess-1")
recent = archive.load_recent("sess-1", 5)
results = archive.search_by_text("sess-1", "hello", top_k=3)

archive.cleanup_expired()
```

### Just the Huffman codec

```python
from lix_chat import HuffmanCodec
from lix_chat.lix_cache.huffman_codec import encode_str, decode_bytes

text = "The quick brown fox jumps over the lazy dog" * 100
compressed = encode_str(text)
restored = decode_bytes(compressed)
assert restored == text
print(f"{len(text)}B → {len(compressed)}B ({len(compressed)/len(text)*100:.0f}%)")
```

## Configuration

All tunables live in a single `CacheConfig` dataclass. No global state, no scattered constants.

```python
from lix_chat import CacheConfig

config = CacheConfig(
    # Redis connection
    redis_host="redis.internal",
    redis_port=6379,
    redis_password="secret",
    redis_key_prefix="mychat",
    redis_pool_size=50,

    # Session context window (Redis DB 2)
    session_redis_db=2,
    session_ttl_seconds=86400,          # 24h
    hot_window_size=20,                 # messages kept in Redis
    session_max_tokens=None,            # no token limit

    # Semantic query cache (Redis DB 0)
    semantic_redis_db=0,
    semantic_ttl_seconds=300,           # 5 min
    semantic_similarity_threshold=0.90, # cosine similarity threshold
    semantic_max_items_per_url=50,

    # URL embedding cache (Redis DB 1)
    url_cache_redis_db=1,
    url_cache_ttl_seconds=86400,        # 24h

    # Disk archive
    archive_dir="./data/conversations",
    disk_ttl_days=14,                   # purge after 14 days

    # LRU eviction
    evict_after_minutes=120,            # 2h idle → migrate to disk
)

# Or from environment variables (12-factor apps):
# Reads MYAPP_REDIS_HOST, MYAPP_REDIS_PORT, MYAPP_SEMANTIC_TTL_SECONDS, etc.
config = CacheConfig.from_env("MYAPP")
```

## Redis DB layout

Three logical databases on a single Redis server:

| DB | Layer | TTL | Scope | What it stores |
|---|---|---|---|---|
| 0 | Semantic query cache | 5 min | Per-session | `(query_embedding, LLM response)` pairs per URL |
| 1 | URL embedding cache | 24h | Global | URL → float32 embedding vector |
| 2 | Session context window | 24h | Per-session | Last 20 conversation messages |

Separate DBs instead of key prefixes so you can `FLUSHDB` one layer without touching others, and monitor each independently via `DBSIZE`.

## How each layer works

### Session Context Window

```
add_message("user", "hello")
│
├─ LPUSH message_id to Redis ordered list
├─ SETEX message JSON with TTL
│
└─ Window > 20?
    ├─ Yes → RPOP oldest
    │        ├─ Append to .huff disk archive
    │        └─ DELETE from Redis
    └─ No → done
```

```
get_context()
│
├─ Redis has messages?
│   ├─ Yes → return them, refresh all TTLs
│   └─ No → session was evicted
│           ├─ Load from .huff archive
│           ├─ Re-hydrate Redis with last 20
│           └─ Return full history
│
└─ Redis down?
    └─ Read everything from disk (graceful fallback)
```

**LRU eviction daemon:** Background thread, checks every 60s. Session idle > `evict_after_minutes` → migrate all Redis messages to disk, free memory. When user returns, `get_context()` re-hydrates transparently.

**smart_context():** Returns `{"recent": [...], "relevant": [...]}` — recent messages from Redis plus semantically relevant messages from the disk archive (matched by embedding cosine similarity).

### Semantic Query Cache

Keyed by `(session_id, URL, query_embedding)`. Each URL stores up to 50 `(embedding, response)` pairs.

On lookup: compute cosine similarity between the new query embedding and all cached embeddings for that URL. If any exceed 0.90 → cache hit, return the cached response, skip the LLM.

- Per-session isolation (privacy)
- 5-minute TTL (freshness)
- Catches rephrasings: "weather Tokyo" vs "Tokyo weather forecast" → cosine ~0.94 → HIT

### URL Embedding Cache

Global (shared across all sessions), 24h TTL. Maps URL → raw float32 bytes in Redis.

Computing embeddings costs ~200ms per URL. This cache means the embedding model only runs once per URL per day, regardless of how many sessions fetch it.

## Hybrid storage: hot + cold

The two-tier architecture:

**Hot (Redis):** Ordered list of message IDs. Each message stored as a separate key with TTL. Fast reads (~1ms). Limited to `hot_window_size` messages per session.

**Cold (Disk):** Huffman-compressed `.huff` files. One file per session at `{archive_dir}/{session_id}.huff`. Self-contained binary format with a 24-byte header you can read without decompressing.

### .huff file format

```
Offset  Size    Field
0       4B      Magic: "CAv1"
4       8B      created_at (float64 LE, unix timestamp)
12      8B      updated_at (float64 LE, unix timestamp)
20      4B      num_turns (uint32 LE)
24      var     Huffman-compressed JSON array of turn objects
```

### Why Huffman over gzip?

Conversation text has very skewed byte frequencies (~18% spaces, ~13% 'e', ~0.07% 'z'). Huffman assigns shorter bit codes to frequent bytes. For small payloads (<100KB), this beats gzip because there's no dictionary overhead. ~54% compression ratio on typical conversation text. Pure Python, zero native dependencies.

## Connection pooling

`create_redis_client()` maintains a global pool keyed by `(host, port, db)`:

```python
from lix_chat import create_redis_client, CacheConfig

config = CacheConfig(redis_host="localhost", redis_port=6379)

# First call: creates ConnectionPool, pings, returns client
client = create_redis_client(host="localhost", port=6379, db=2, config=config)

# Same (host, port, db): reuses existing pool
client = create_redis_client(host="localhost", port=6379, db=2, config=config)
```

Handles auth gracefully — tries with password first, falls back to no-auth on `AuthenticationError`.

## API reference

### CacheConfig

| Method | Description |
|---|---|
| `CacheConfig(**kwargs)` | Create config with explicit values |
| `CacheConfig.from_env(prefix)` | Load from env vars: `{PREFIX}_REDIS_HOST`, etc. |

### CacheCoordinator

| Method | Description |
|---|---|
| `__init__(session_id, config?)` | Initialize all 3 layers |
| `add_message_to_context(role, content, metadata?)` | Add to session window |
| `get_context_messages()` | Get rolling window |
| `get_formatted_context(max_lines?)` | Get as formatted string |
| `get_semantic_response(url, query_embedding)` | Check semantic cache |
| `cache_semantic_response(url, query_embedding, response)` | Store in semantic cache |
| `get_url_embedding(url)` | Get cached URL embedding |
| `cache_url_embedding(url, embedding)` | Cache URL embedding |
| `batch_cache_url_embeddings(dict)` | Batch cache |
| `clear_session_cache()` | Clear semantic + context |
| `clear_context()` | Clear context only |
| `get_stats()` | Stats from all 3 layers |

### SessionContextWindow

| Method | Description |
|---|---|
| `__init__(session_id, config?, **kwargs)` | Create context window |
| `add_message(role, content, metadata?)` | Add a message |
| `get_context()` | Get hot window messages |
| `get_full_history()` | All messages (Redis + disk) |
| `smart_context(query, embedding?, recent_k?, disk_k?)` | Recent + relevant from disk |
| `get_formatted_context(max_lines?)` | As formatted string |
| `flush_to_disk()` | Force migrate Redis → disk |
| `clear()` | Wipe Redis hot window |
| `get_stats()` | Session statistics |

### HybridConversationCache

| Method | Description |
|---|---|
| `__init__(session_id, config?, **kwargs)` | Create hybrid cache |
| `add_message(role, content, metadata?, embedding?)` | Add message (auto-evicts overflow) |
| `get_context()` | Hot window (auto re-hydrates from disk) |
| `get_full()` | Merge hot + cold |
| `smart_context(query, embedding?, recent_k?, disk_k?)` | Recent + relevant |
| `flush_to_disk()` | Migrate Redis → disk |
| `clear()` | Clear Redis keys |
| `delete_session()` | Delete from Redis + disk |
| `get_stats()` | Hot count, disk turns, sizes |

### ConversationArchive

| Method | Description |
|---|---|
| `__init__(archive_dir, session_ttl_days?)` | Create archive |
| `append_turn(session_id, turn)` | Append single turn |
| `append_turns(session_id, turns)` | Batch append |
| `load_all(session_id)` | Load all turns |
| `load_recent(session_id, n)` | Load last N turns |
| `search_by_text(session_id, query, top_k?)` | Text overlap search |
| `search_by_embedding(session_id, embedding, top_k?)` | Cosine similarity search |
| `delete_session(session_id)` | Delete archive file |
| `session_exists(session_id)` | Check if .huff exists |
| `get_metadata(session_id)` | Read header without decompressing |
| `cleanup_expired()` | Purge sessions older than TTL |
| `list_sessions()` | List all archived sessions |

### SemanticCacheRedis

| Method | Description |
|---|---|
| `__init__(session_id, config?, **kwargs)` | Create semantic cache |
| `get(url, query_embedding)` | Check for cached response |
| `set(url, query_embedding, response)` | Cache a response |
| `clear_session()` | Delete all entries for this session |
| `get_stats()` | Cache statistics |

### URLEmbeddingCache

| Method | Description |
|---|---|
| `__init__(session_id, config?, **kwargs)` | Create embedding cache |
| `get(url)` | Get cached embedding (np.ndarray or None) |
| `set(url, embedding)` | Cache an embedding |
| `batch_set(url_embeddings)` | Batch cache |
| `get_stats()` | Cache statistics |

### HuffmanCodec

| Method | Description |
|---|---|
| `HuffmanCodec.encode(data: bytes)` | Compress bytes → bytes |
| `HuffmanCodec.decode(data: bytes)` | Decompress bytes → bytes |
| `encode_str(text: str)` | Compress string → bytes |
| `decode_bytes(data: bytes)` | Decompress bytes → string |

## Publishing to PyPI

```bash
cd lix_chat
pip install build twine

# Build
python -m build

# Test on TestPyPI first
twine upload --repository testpypi dist/*
pip install --index-url https://test.pypi.org/simple/ lix-chat

# Publish to production PyPI
twine upload dist/*
```

For CI/CD, add a GitHub Actions workflow triggered on release:

```yaml
name: Publish to PyPI
on:
  release:
    types: [published]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install build twine
      - run: cd lix_chat && python -m build
      - run: cd lix_chat && twine upload dist/*
        env:
          TWINE_USERNAME: __token__
          TWINE_PASSWORD: ${{ secrets.PYPI_TOKEN }}
```

## License

MIT — same as lixSearch.
