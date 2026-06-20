> Generate text, images, video, audio, realtime voice, and embeddings with a single API. OpenAI-compatible — use any OpenAI SDK by changing the base URL.

**Base URL:** `https://gen.pollinations.ai`

**Get your API key:** [enter.pollinations.ai](https://enter.pollinations.ai)

**Integration guides:** [BYOP, CLI, MCP Server](/docs/guides)

## Quick Start

### Text (Python, OpenAI SDK)

```python
from openai import OpenAI
client = OpenAI(base_url="https://gen.pollinations.ai", api_key="YOUR_API_KEY")
response = client.chat.completions.create(model="openai", messages=[{"role": "user", "content": "Hello!"}])
print(response.choices[0].message.content)
```

### Image (URL — no code needed)

```
https://gen.pollinations.ai/image/a%20cat%20in%20space?model=flux
```

### Audio (cURL)

```bash
curl "https://gen.pollinations.ai/audio/Hello%20world?voice=nova" \
  -H "Authorization: Bearer YOUR_API_KEY" -o speech.mp3
```

### Embeddings (OpenAI-compatible)

```bash
curl https://gen.pollinations.ai/v1/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai-3-small","input":"Hello world","dimensions":512}'
```

See `GET /v1/models` for every text, image, audio, video, and embedding model available.

## Authentication

All generation requests require an API key from [enter.pollinations.ai](https://enter.pollinations.ai). Model listing endpoints work without authentication.

| Type | Prefix | Use case | Rate limits |
|------|--------|----------|-------------|
| Secret | `sk_` | Server-side apps | None |
| Publishable | `pk_` | Client-side apps (beta) | 1 pollen/IP/hour |

Two ways to authenticate:

- Header: `Authorization: Bearer YOUR_API_KEY`
- Query param: `?key=YOUR_API_KEY`

> **Warning:** Never expose secret keys (`sk_`) in client-side code. Use publishable keys (`pk_`) for frontend apps.

## Text Generation

Generate text responses using AI models. Fully compatible with the OpenAI Chat Completions API — use any OpenAI SDK by changing the base URL.

| Endpoint | Best for |
|----------|----------|
| `POST /v1/chat/completions` | Full OpenAI compatibility — streaming, tools, vision, structured outputs |
| `GET /text/{prompt}` | Quick prototyping — simple GET, returns plain text |

**Available models:** openai, openai-fast, gpt-5.4, gpt-5.4-mini, openai-large, qwen-coder, mistral-small-3.2, mistral, openai-audio, openai-audio-large, gemini-3-flash, gemini, gemini-flash-lite-3.1, gemini-fast, deepseek, gemma, deepseek-pro, grok, grok-4-20-reasoning, grok-large, gemini-search, gemini-search-fast, gemini-search-large, midijourney, midijourney-large, claude-fast, claude, claude-opus-4.6, claude-opus-4.7, claude-large, perplexity-fast, perplexity-deep, perplexity, perplexity-reasoning, kimi, kimi-code, gemini-large, nova-fast, nova, glm, llama, llama-maverick, llama-scout, minimax-m2.7, minimax, mistral-large, polly, qwen-coder-large, qwen-large, qwen-vision, qwen-vision-pro, step-flash, step-3.5-flash, qwen-safety

## Image Generation

Generate images from text prompts via a simple GET request. Returns JPEG or PNG.

```
https://gen.pollinations.ai/image/a%20cat%20in%20space?model=flux
```

**Available models:** kontext, nanobanana, nanobanana-2, nanobanana-pro, seedream5, seedream, seedream-pro, ideogram-v4-turbo, ideogram-v4-balanced, ideogram-v4-quality, gptimage, gptimage-large, gpt-image-2, flux, zimage, wan-image, wan-image-pro, qwen-image, grok-imagine, grok-imagine-pro, klein, p-image, p-image-edit, nova-canvas

## Video Generation

Generate videos from text prompts or reference images. Returns MP4.

```
https://gen.pollinations.ai/video/sunset%20timelapse?model=veo&duration=4
```

**Available models:** veo, seedance-pro, seedance-2.0, wan, wan-fast, wan-pro, wan-pro-1080p, grok-video-pro, ltx-2, p-video-720p, p-video-1080p, nova-reel

## Realtime Voice

OpenAI-compatible Realtime WebSocket proxy for voice and multimodal sessions.

| Endpoint | Description |
|----------|-------------|
| `GET /v1/realtime` | WebSocket Realtime session (`model=gpt-realtime-2`) |

Requires an API key with positive balance. Server clients can use `Authorization: Bearer <key>`; browser WebSocket clients can use `?key=pk_...`.

The WebSocket proxy aggregates observed `response.done` usage and settles one billing event when the session closes. Input transcription sessions are not supported yet.

Events sent and received over the socket use the OpenAI Realtime protocol unchanged. See OpenAI's [Realtime WebSocket events guide](https://developers.openai.com/api/docs/guides/realtime-websocket#sending-and-receiving-events).

```js
import WebSocket from "ws";

// Server: Bearer auth. Browser: append `&key=pk_...` instead (headers aren't settable).
const ws = new WebSocket(
    "wss://gen.pollinations.ai/v1/realtime?model=gpt-realtime-2",
    { headers: { Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}` } },
);

ws.on("open", () => ws.send(JSON.stringify({
    type: "session.update",
    session: { type: "realtime", instructions: "Be concise." },
})));
ws.on("message", (m) => console.log(JSON.parse(m.toString())));
```

**Browser audio:** play the model's audio through an `<audio>` element (e.g. a Web Audio `MediaStreamDestination` set as the element's `srcObject`), not straight to the Web Audio output. The browser only uses audio-element output as the echo-cancellation reference, so without it the mic re-captures the model's voice and it starts replying to itself. The WebRTC transport handles this automatically; on the WebSocket transport it's the client's responsibility.

**Realtime models:** gpt-realtime-2

## Audio Generation

Text-to-speech, music generation, and audio transcription.

| Endpoint | Description |
|----------|-------------|
| `GET /audio/{text}` | Simple URL-based TTS or music generation |
| `POST /v1/audio/speech` | OpenAI-compatible TTS |
| `POST /v1/audio/transcriptions` | Speech-to-text transcription |

**Audio models:** elevenlabs, elevenflash, elevenmusic, whisper, scribe, universal-2, universal-3-pro, acestep, qwen-tts, qwen-tts-instruct

**Available voices:** alloy, echo, fable, onyx, nova, shimmer, ash, ballad, coral, sage, verse, rachel, domi, bella, elli, charlotte, dorothy, sarah, emily, lily, matilda, adam, antoni, arnold, josh, sam, daniel, charlie, james, fin, callum, liam, george, brian, bill

## Embeddings

Generate vector embeddings with an OpenAI-compatible response format.

| Endpoint | Description |
|----------|-------------|
| `POST /v1/embeddings` | OpenAI-compatible embeddings endpoint |
| `GET /embeddings/models` | Embedding models with pricing and modalities |

`gemini-2` supports text, image, audio, and video inputs. `openai-3-small` and `openai-3-large` are text-only models.

String batch input supports up to 32 items. `task_type` is Gemini-only. Dimensions are model-specific: `openai-3-small` supports up to 1536; `gemini-2` and `openai-3-large` support up to 3072; `qwen3-embedding-8b` supports up to 4096.

**Embedding models:** gemini-2, openai-3-small, openai-3-large, cohere-embed-v4, qwen3-embedding-8b

## Models

Discover available models with pricing, capabilities, and metadata. No authentication required.

| Endpoint | Returns |
|----------|---------|
| `GET /models` | All models with pricing, capabilities, and metadata |
| `GET /v1/models` | All models in OpenAI-compatible format (`{object: "list", data: [...]}`) |
| `GET /text/models` | Text models with pricing, context window, tool support |
| `GET /image/models` | Image & video models with capabilities and pricing |
| `GET /audio/models` | Audio models with supported voices |
| `GET /embeddings/models` | Embedding models with supported modalities |

Rich model endpoints include `capabilities` for agentic/model traits:
`tool_calling`, `reasoning`, `web_search`, and `code_execution`.
Modalities, video frame controls, voices, and context length remain separate
structured fields.

## Media Storage

Content-addressed media storage. Upload and retrieve images, audio, and video by content hash.

Base URL: https://media.pollinations.ai

| Endpoint | Description |
|----------|-------------|
| `POST /upload` | Upload a file, receive a content-addressed URL |
| `GET /{hash}` | Retrieve a previously uploaded file |
| `GET /{hash}/metadata` | Get file metadata as JSON |

Upload requires API key; retrieval is public.

```bash
curl -X POST "https://media.pollinations.ai/upload" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F file=@path/to/image.png
```

## Account

Self-service endpoints for the authenticated user. All endpoints require authentication (API key or session). API keys need the relevant `account:<scope>` permission. Base path: `/account`.

| Endpoint | Description |
|----------|-------------|
| `GET /account/profile` | GitHub username, image, tier, reset time |
| `GET /account/balance` | Current pollen balance |
| `GET /account/usage` | Per-request usage history with costs |
| `GET /account/usage/daily` | Daily aggregated usage for dashboards |
| `GET /account/key` | API key validity, type, and permissions |

### GET /account/profile

Returns user profile. `githubUsername`, `image`, `tier`, and `nextResetAt` are always included. `name` and `email` are included only when the API key has the `account:profile` permission.

### GET /account/balance

Returns remaining pollen. If the API key has a budget, returns key budget instead.

### GET /account/usage

Per-request usage history: model, token counts, cost, response time.

### GET /account/usage/daily

Daily aggregated usage suitable for dashboards.

### GET /account/key

Returns the current API key's validity, type, and permissions.

## Safety

Optional safety checking runs on text input before generation. Omitted, `false`, or `0` means off.

Use `safe` as a query parameter or JSON body field, or send the same value in the `Pollinations-Safe` header.

Values: `privacy` redacts personal information like names, email, phone, address, IP, URLs, and usernames. `secrets` redacts keys and passwords. `sexual`, `violence`, and `shield` block matching requests. Aliases: `true` = `privacy,secrets`, `nsfw` = `sexual,violence`.

```bash
curl "https://gen.pollinations.ai/text/email%20me%20at%20a%40example.com?safe=privacy" \
  -H "Authorization: Bearer YOUR_API_KEY"

curl https://gen.pollinations.ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Pollinations-Safe: privacy" \
  -d '{"model":"openai","messages":[{"role":"user","content":"email me at a@example.com"}]}'
```

Large requests check the latest 50,000 text characters, across up to 25 text parts, in one safety call.

Blocked requests return `400` with `error.type: "safety_error"`. Safety service failures return `503`. Check `X-Safety-Applied`, `X-Safety-Redacted`, and `X-Safety-Status` headers.

## Errors

All errors return JSON with a consistent shape:

```json
{
  "status": 400,
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Description of what went wrong"
  }
}
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid parameters or malformed request |
| `401` | Missing or invalid API key |
| `402` | Insufficient pollen balance |
| `403` | API key lacks required permission |
| `500` | Internal server error |

## Public Stats

Anonymous, read-only platform statistics served directly from Tinybird. No
account or API key needed — pass the shared public read token as a query param.

Base URL: `https://api.europe-west2.gcp.tinybird.co`

Public read token (safe to embed client-side):

```
p.eyJ1IjogImFjYTYzZjc5LThjNTYtNDhlNC05NWJjLWEyYmFjMTY0NmJkMyIsICJpZCI6ICI5ZWZmMGM3Ni1kOTZkLTQwYjgtYWQwOC1mNDFlMmRiYjBmYTIiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0.6VnVkAQ5h_fkcDZVDUoU38dzTxaw0xo3DnmKkhECbA8
```

| Endpoint | Params | Returns |
|----------|--------|---------|
| `GET /v0/pipes/public_model_stats.json` | `limit` (50) | Per-model usage over the last 7 days: request count, avg cost, avg response time |
| `GET /v0/pipes/model_health.json` | `minutes` (60) | Per-model health in a recent window: 2xx/4xx/5xx counts, latency p50/p95 |
| `GET /v0/pipes/weekly_health_stats.json` | `weeks_back` (12) | Weekly service availability (`2xx / (2xx + 5xx)`, cache excluded) and latency |
| `GET /v0/pipes/app_top_weekly.json` | — | Top 10 registered apps owned by showcase contributors, by request count over the last 7 days. The owner is listed in the directory; the returned app may be any of their registered apps |
| `GET /v0/pipes/app_directory_public.json` | `category`, `platform`, `limit` (1000) | The community app directory ([apps/APPS.md](https://github.com/pollinations/pollinations/blob/main/apps/APPS.md)) |

Each response is JSON: a `data` array of rows plus a `meta` array typing each
column. Append `&token=<public-read-token>` to authenticate.

```bash
curl "https://api.europe-west2.gcp.tinybird.co/v0/pipes/public_model_stats.json?limit=5&token=PUBLIC_READ_TOKEN"
```

## BYOP

BYOP (Bring Your Own Pollen) lets your users authorize your app to spend their own Pollen on Pollinations requests. Your publishable App Key (`pk_...`) identifies the app; after approval, Pollinations returns a scoped user key (`sk_...`) for API calls.

Users stay in control of their balance, budgets, and revocation; your app never has to pay for their usage.

## 🗝️ App Key

An **App Key** (`pk_...`) is the publishable key your app sends users to Pollinations with. Without one, the consent screen falls back to the redirect hostname and traffic isn't attributed to your account.

To create one, go to [enter.pollinations.ai](https://enter.pollinations.ai) → **Create New App Key**:

<p align="left"><img src="https://media.pollinations.ai/1133540dc4c19635" alt="Edit App Key" width="420"></p>

Set the **Name** (shows on the consent screen). For web apps, add at least one **Redirect URI** (your exact callback URL). The key you get back is your `client_id` (a `pk_...` publishable key; the legacy name `app_key` is still accepted).

When a user lands on the consent screen signed-out, they're prompted to continue with GitHub:

<p align="left"><img src="https://media.pollinations.ai/fbc04dd1c77dbfd8" alt="Authorize — signed out" width="420"></p>

Once signed in, they review the requested access and confirm:

<p align="left"><img src="https://media.pollinations.ai/a7e4a1e9c5f48b8d" alt="Authorize — signed in" width="420"></p>

## Developer Earnings

Developer earnings are opt-in per App Key. When enabled, users pay 25% over base rates. The markup credits to your balance.

```text
Base request cost: 1.00 pollen
User pays:         1.25 pollen
You receive:       0.25 pollen
```

Credits land in the same balance type the user paid from: tier balance when the request used tier balance, paid balance when it used paid balance.

Pass `earningsEnabled: true` when creating an App Key via the API, or toggle it later from the dashboard:

```bash
curl -X POST https://gen.pollinations.ai/account/keys \
  -H 'Authorization: Bearer sk_yoursecretkey' \
  -H 'Content-Type: application/json' \
  -d '{"name":"my-app","type":"publishable","redirectUris":["https://myapp.com/callback"],"earningsEnabled":true}'
```

## ⚙️ Web Apps (Redirect Flow)

### 1. Build the Auth Link

With `client_id` (consent screen shows your app name + your GitHub):
```
https://enter.pollinations.ai/authorize?redirect_uri=https://myapp.com&client_id=pk_yourkey
```

Without (still works, just shows the hostname):
```
https://enter.pollinations.ai/authorize?redirect_uri=https://myapp.com
```

With restrictions:
```
https://enter.pollinations.ai/authorize?redirect_uri=https://myapp.com&client_id=pk_yourkey&scope=usage&models=flux,openai&expiry=7&budget=10
```

| Param | What it does | Example |
|-------|-------------|---------|
| `client_id` | Your publishable key — shows app name + author on consent screen, tracks traffic for tier upgrades | `pk_abc123` |
| `redirect_uri` | Where users return after authorizing — receives the temp API key in the URL fragment | `https://myapp.com` |
| `state` | Opaque value echoed back on the callback for CSRF protection | `any-random-string` |
| `scope` | Account access (space or comma separated) | `usage keys` |
| `models` | Restrict to specific models | `flux,openai,gptimage` |
| `budget` | Numeric Pollen cap. Defaults to `5`; users can clear the budget field on the consent screen for unlimited. | `10` |
| `expiry` | User-authorized key lifetime in days (default: 7) | `7` |

Legacy names `app_key`, `redirect_url`, and `permissions` are still accepted for backwards compatibility.

### 2. Handle the Redirect

User comes back with a key in the URL fragment:
```
https://myapp.com#api_key=sk_abc123xyz
```

Fragment, not query param — never hits server logs. 🔒 If you passed `state`, it's echoed back: `#api_key=sk_...&state=...`. On denial the fragment is `#error=access_denied&state=...`.

### 💻 Code

```javascript
// Send user to auth
const params = new URLSearchParams({
  redirect_uri: location.href,
  client_id: 'pk_yourkey', // optional — shows app name + author
});
window.location.href = `https://enter.pollinations.ai/authorize?${params}`;

// Grab key from URL after redirect
const apiKey = new URLSearchParams(location.hash.slice(1)).get('api_key');

// Use their pollen
fetch('https://gen.pollinations.ai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'openai', messages: [{ role: 'user', content: 'yo' }] })
});
```

## 🖥️ CLIs & Headless Apps (Device Flow)

Same authorize screen, but the user opens a browser separately. Your CLI polls for the key.

**Where this fits:**
- **Discord / Telegram / WhatsApp bots** — bot DMs the code, user approves in browser, bot gets their key
- **CLI tools** — `pollinations login` opens a browser, CLI waits for approval
- **MCP servers** — AI agent requests access, user approves from their browser
- **Raspberry Pi / IoT** — headless device displays a code, user approves on their phone
- **VS Code extensions** — extension shows the code, user approves in browser

```bash
# 1. request a device code (pass your app_key as client_id for attribution)
curl -X POST https://enter.pollinations.ai/api/device/code \
  -H 'Content-Type: application/json' \
  -d '{"client_id": "pk_yourkey", "scope": "generate"}'
# → { "device_code": "...", "user_code": "ABCD-1234", "verification_uri": "/device" }

# 2. tell user: "go to enter.pollinations.ai/device and enter ABCD-1234"

# 3. poll for the key (every 5s)
curl -X POST https://enter.pollinations.ai/api/device/token \
  -H 'Content-Type: application/json' \
  -d '{"device_code": "..."}'
# pending → { "error": "authorization_pending" }
# done    → { "access_token": "sk_...", "token_type": "bearer", "scope": "generate" }
```

## 👤 Who's Using This Key?

Once you have the user-authorized `sk_...` key, you can check who it belongs to:

```bash
curl https://enter.pollinations.ai/api/device/userinfo \
  -H 'Authorization: Bearer sk_...'
# → { "sub": "user-id", "name": "Thomas", "preferred_username": "voodoohop", "email": "...", "picture": "..." }
```

Standard OIDC userinfo shape.

---

🕐 User-authorized keys default to 7 days. Users can revoke anytime from the dashboard.

[edit this doc](https://github.com/pollinations/pollinations/edit/main/BRING_YOUR_OWN_POLLEN.md) · *h/t [Puter.js](https://docs.puter.com/user-pays-model/) for the idea*

## CLI

The Pollinations CLI — for humans, AI agents, and everything in between.

Generate text, images, audio, video from the terminal. Backed by the [Pollinations API](https://gen.pollinations.ai).

```bash
npx @pollinations/cli gen image "a cat in space" --output cat.png
```

## For AI agents

Point your coding agent (Claude Code, Cursor, Windsurf, Codex) at the skill file and it gets the full usage map — flags, stdin conventions, `--json` output shape, error codes, the lot:

> Read https://raw.githubusercontent.com/pollinations/pollinations/main/packages/polli-cli/SKILL.md and follow the instructions to generate media with the `polli` CLI.

The skill also ships inside the package: `node_modules/@pollinations/cli/SKILL.md`.

Every command is agent-friendly:

- `--json` — structured stdout, human messages to stderr. Safe to parse.
- Exit code `0` on success, non-zero on error.
- When a call runs out of pollen, the first line of the error is the top-up link.
- `polli auth status --json` exposes everything about the current session.

## Get started

```bash
npm install -g @pollinations/cli     # installs the `polli` binary
polli auth login                         # device-flow via enter.pollinations.ai
printf '%s' "$POLLINATIONS_API_KEY" | polli auth login --with-token
```

Credentials land at `~/.pollinations/credentials.json`. For one-off runs pass `--key sk_...` or set `POLLINATIONS_API_KEY`. Get keys at [enter.pollinations.ai](https://enter.pollinations.ai).

## Generate

```bash
polli gen text "Explain quantum tunneling in one sentence"
polli gen text "Summarize this" < notes.md          # stdin becomes context
echo "context" | polli gen text "question"

polli gen image "cyberpunk city at night" --model flux --output city.png
polli gen image "enhance this" --image https://media.pollinations.ai/abc --model gptimage

polli gen audio "Hello world" --voice nova --output speech.mp3
polli gen audio "read it to me" --play                # plays back after saving (blocks until done)
polli gen video "a waterfall in slow motion" --duration 5 --output clip.mp4
polli gen transcribe speech.mp3

polli gen chat --model openai                         # interactive multi-turn
```

`gen text` streams by default. File-output commands pick a sensible default path if `--output` is omitted.

## Discover

```bash
polli models                 # all models
polli models --type image    # filter
polli models --stats         # health + perf (last 60m)
polli docs                   # full API reference in the terminal
polli docs /image            # one endpoint
polli docs --open            # open in browser
```

## Account

Two kinds of keys:

- **Secret (`sk_`)** — backend use, full access. Default.
- **Publishable (`pk_`)** — safe to ship in frontend code.

```bash
polli keys list
polli keys create --name mybot --budget 100                    # secret (default)
polli keys create --name myapp --type publishable              # API publishable
polli keys create --name myapp --type publishable \            # 3rd-party app key
  --redirect-uri https://myapp.com/callback --earnings
polli keys revoke <id>
```

Keys can't be edited — to change a name, budget, or model list, revoke and recreate. Publishable app keys default developer earnings off; pass `--earnings` to enable them.

```bash
polli usage                  # pollen balance
polli usage --history        # recent requests
polli usage --daily          # daily spend
```

## Links

- [gen.pollinations.ai](https://gen.pollinations.ai) — API
- [enter.pollinations.ai](https://enter.pollinations.ai) — dashboard, keys, billing
- [API docs](https://gen.pollinations.ai/docs)
- [Source](https://github.com/pollinations/pollinations/tree/main/packages/polli-cli)
- [Discord](https://discord.gg/pollinations-ai-885844321461485618)

## License

MIT

## MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server for pollinations.ai. Lets MCP-capable hosts (Claude Desktop, Cursor, Windsurf, …) generate images, videos, text, and audio, plus check the authenticated key's Pollen balance and usage.

All calls go through `https://gen.pollinations.ai`. Models, voices, and pricing are read live from the registry — no hardcoded enums.

## Quick Start

```bash
# Run directly with npx (no installation required)
npx @pollinations/mcp
```

Or install globally:

```bash
npm install -g @pollinations/mcp
pollinations-mcp
```

## Authentication

Get your API key at [enter.pollinations.ai](https://enter.pollinations.ai), or use [BYOP](../../BRING_YOUR_OWN_POLLEN.md) to let users bring their own pollen (supports web redirects and [device flow](../../BRING_YOUR_OWN_POLLEN.md#clis--headless-apps-device-flow) for CLIs).

**Key types:**

- `pk_` (publishable) — client-safe, rate-limited (1 pollen per IP per hour)
- `sk_` (secret) — server-side only, no rate limits, can spend Pollen

Set your key via environment variable or the `setApiKey` tool:

```bash
export POLLINATIONS_API_KEY=sk_your_key_here
npx @pollinations/mcp
```

## Available Tools

### Image & Video Generation

| Tool                 | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `generateImageUrl`   | Generate a shareable image URL from a text prompt          |
| `generateImage`      | Generate an image and return base64 data                   |
| `generateImageBatch` | Generate multiple images in parallel (best with `sk_` keys)|
| `generateVideo`      | Generate a video and return base64 data                    |
| `generateVideoUrl`   | Generate a shareable video URL from a text prompt          |
| `describeImage`      | Vision analysis of an image URL                            |
| `analyzeVideo`       | Analyze YouTube videos or video URLs                       |
| `listImageModels`    | List available image & video models (live)                 |

Common image parameters: `prompt`, `model`, `width`, `height`, `seed`, `quality`, `image` (for image-to-image), `transparent`. Common video parameters: `model`, `duration`, `aspectRatio`, `audio`. Call `listImageModels` for the current model set and per-model capabilities.

### Text Generation

| Tool             | Description                                       |
| ---------------- | ------------------------------------------------- |
| `generateText`   | Simple text generation from a prompt              |
| `chatCompletion` | OpenAI-compatible chat completions + tool calling |
| `webSearch`      | Web-grounded answers (perplexity, gemini-search)  |
| `listTextModels` | List available text models (live)                 |
| `getPricing`     | Per-model pricing (text / image / audio)          |

Call `listTextModels` for the current model set, aliases, and capabilities (reasoning, tools, audio output, etc.).

### Audio

| Tool               | Description                              |
| ------------------ | ---------------------------------------- |
| `respondAudio`     | AI responds to a prompt with speech      |
| `sayText`          | Text-to-speech (verbatim)                |
| `transcribeAudio`  | Transcribe audio (gemini-large)          |
| `listAudioVoices`  | List available voices (live)             |

Call `listAudioVoices` for the current voice list. Output formats: mp3, wav, flac, opus, pcm16.

### Auth Tools

| Tool          | Description                          |
| ------------- | ------------------------------------ |
| `setApiKey`   | Set the API key for this session     |
| `getKeyInfo`  | Check stored key type/prefix (local) |
| `clearApiKey` | Remove the stored key                |

### Account

| Tool         | Description                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| `getBalance` | Remaining Pollen for the authenticated key (requires `account:usage`)        |
| `getUsage`   | Per-request history, or daily aggregate when `daily: true` (`account:usage`) |

## Claude Desktop Integration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "pollinations": {
      "command": "npx",
      "args": ["@pollinations/mcp"],
      "env": {
        "POLLINATIONS_API_KEY": "sk_your_key_here"
      }
    }
  }
}
```

## Examples

```text
Generate an image of a sunset over mountains using the flux model.

Create a 6-second video of waves crashing on a beach using veo.

Have a chatCompletion conversation about the weather, with the ability to call a weather API.

Say "Hello, welcome to pollinations.ai!" using the nova voice.
```

## Testing

```bash
POLLINATIONS_API_KEY=sk_… npm run test
```

Spawns the server over stdio, lists tools, and exercises a small live slice (auth, text, image URL, balance). Skips authenticated calls when the env var is unset.

## System Requirements

- Node.js 18.0.0 or higher

## API Reference

All requests go through `https://gen.pollinations.ai`. Full API docs: [gen.pollinations.ai/docs](https://gen.pollinations.ai/docs).

## License

MIT

## Links

- [pollinations.ai](https://pollinations.ai)
- [API Documentation](https://gen.pollinations.ai/docs)
- [GitHub Issues](https://github.com/pollinations/pollinations/issues)