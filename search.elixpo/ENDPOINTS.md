# Elixpo Search API Reference

Base URL: `https://search.elixpo.com`

No API key required. All endpoints are open.

---

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | OpenAI-compatible chat completions |
| `/api/search` | GET / POST | Native search endpoint (SSE streaming by default) |
| `/api/chat` | POST | Conversational chat with optional web search |
| `/v1/models` | GET | List available models |
| `/api/health` | GET | Health check |

---

## 1. Simple Query

```bash
curl -X POST https://search.elixpo.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the capital of France?"}
    ],
    "stream": false
  }'
```

**Response:**

```json
{
  "id": "chatcmpl-a1b2c3d4e5f6",
  "object": "chat.completion",
  "created": 1774027000,
  "model": "lixsearch",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is **Paris**. ..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 42,
    "total_tokens": 50
  }
}
```

---

## 2. Web Search Query (Streaming)

The pipeline automatically searches the web when the question needs real-time info.

```bash
curl -N -X POST https://search.elixpo.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Latest SpaceX launch news today"}
    ],
    "stream": true
  }'
```

**Response (SSE stream):**

```
data: {"id":"chatcmpl-a1b2c3","object":"chat.completion.chunk","created":1774027000,"model":"lixsearch","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-a1b2c3","object":"chat.completion.chunk","created":1774027001,"model":"lixsearch","choices":[{"index":0,"delta":{"content":"SpaceX successfully launched..."},"finish_reason":null}]}

data: {"id":"chatcmpl-a1b2c3","object":"chat.completion.chunk","created":1774027005,"model":"lixsearch","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

---

## 3. Multi-turn Conversation (History in Payload)

Pass previous messages in the `messages` array. No `session_id` needed.

```bash
curl -X POST https://search.elixpo.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Compare React and Vue for building dashboards"},
      {"role": "assistant", "content": "React offers a larger ecosystem with libraries like Recharts..."},
      {"role": "user", "content": "Which one has better TypeScript support?"}
    ],
    "stream": false
  }'
```

---

## 4. Multi-turn with Persistent Session

Pass `session_id` to enable server-side conversation memory across separate requests.

```bash
# First message
curl -X POST https://search.elixpo.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explain quantum computing basics"}
    ],
    "session_id": "my-app-session-abc123",
    "stream": false
  }'

# Follow-up — server remembers the previous exchange
curl -X POST https://search.elixpo.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "How does that relate to cryptography?"}
    ],
    "session_id": "my-app-session-abc123",
    "stream": false
  }'
```

---

## 5. Image Input (Vision)

Uses standard OpenAI vision format.

```bash
curl -X POST https://search.elixpo.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "What is shown in this image?"},
          {"type": "image_url", "image_url": {"url": "https://example.com/photo.jpg"}}
        ]
      }
    ],
    "stream": false
  }'
```

**Multiple images (up to 3):**

```bash
curl -X POST https://search.elixpo.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "Compare these two charts"},
          {"type": "image_url", "image_url": {"url": "https://example.com/chart1.png"}},
          {"type": "image_url", "image_url": {"url": "https://example.com/chart2.png"}}
        ]
      }
    ],
    "stream": false
  }'
```

---

## 6. PDF Export

Ask for a PDF in your query. The pipeline generates it and returns a download link.

```bash
curl -X POST https://search.elixpo.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Give me a detailed report on climate change trends in 2025 and export it as a PDF"}
    ],
    "stream": false
  }'
```

**Response includes a download link:**

```json
{
  "choices": [
    {
      "message": {
        "content": "Here's your report...\n\n---\n\n[Download PDF](https://search.elixpo.com/api/content/abc123-def456)"
      }
    }
  ]
}
```

---

## 7. Native Search Endpoint

Simpler integration that doesn't need OpenAI compatibility.

**GET:**

```bash
curl "https://search.elixpo.com/api/search?query=best+restaurants+in+tokyo&stream=false"
```

**POST:**

```bash
curl -X POST https://search.elixpo.com/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best restaurants in tokyo",
    "stream": true
  }'
```

**POST with image:**

```bash
curl -X POST https://search.elixpo.com/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "identify this plant",
    "image_url": "https://example.com/plant.jpg",
    "stream": false
  }'
```

**POST with multiple images (up to 3):**

```bash
curl -X POST https://search.elixpo.com/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "compare these logos",
    "images": [
      "https://example.com/logo1.png",
      "https://example.com/logo2.png"
    ],
    "stream": false
  }'
```

---

## 8. List Models

```bash
curl https://search.elixpo.com/v1/models
```

```json
{
  "object": "list",
  "data": [
    {
      "id": "lixsearch",
      "object": "model",
      "owned_by": "elixpo"
    }
  ]
}
```

---

## Session Behavior

| Scenario | `session_id` | Conversation History | Server Persistence |
|----------|-------------|---------------------|-------------------|
| Stateless | Omitted | From `messages` array only | None |
| Persistent | Provided | Server-side (Redis + disk) | Yes (30-day TTL) |

**When `session_id` is omitted:**

- An ephemeral ID is auto-generated per request
- No Redis/disk lookups — faster response
- Context comes entirely from the `messages` array you send
- Nothing is persisted after the response

**When `session_id` is provided:**

- Server stores up to 20 recent messages in Redis
- Older messages archived to disk (30-day TTL)
- Follow-up requests with the same `session_id` get full context automatically
- You can send just the new query without repeating history

---

## Error Responses

All errors follow OpenAI format:

```json
{
  "error": {
    "message": "No user message found in messages",
    "type": "invalid_request_error"
  }
}
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid request (missing query, bad image URL) |
| 503 | Server not initialized (starting up) |
| 500 | Internal server error |
