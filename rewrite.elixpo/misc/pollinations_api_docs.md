# Pollinations API

> Generate text, images, video, and audio with a single API. OpenAI-compatible — use any OpenAI SDK by changing the base URL.

Base URL: https://gen.pollinations.ai
API Keys: https://enter.pollinations.ai
Docs: https://gen.pollinations.ai/api/docs

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

### Image (Python, OpenAI SDK)

```python
from openai import OpenAI
client = OpenAI(base_url="https://gen.pollinations.ai/v1", api_key="YOUR_API_KEY")
response = client.images.generate(model="flux", prompt="a cat in space", size="1024x1024")
print(response.data[0].url)
```

### Audio (cURL)

```bash
curl "https://gen.pollinations.ai/audio/Hello%20world?voice=nova" \
  -H "Authorization: Bearer YOUR_API_KEY" -o speech.mp3
```

## Authentication

All generation requests require an API key. Model listing endpoints work without auth.

- Header: `Authorization: Bearer YOUR_API_KEY`
- Query param: `?key=YOUR_API_KEY`

Key types: `sk_` (secret, server-side) | `pk_` (publishable, client-side, rate limited)

## Endpoints

### POST /v1/chat/completions
OpenAI-compatible chat completions. Use any OpenAI SDK with base_url="https://gen.pollinations.ai".

Request body (JSON):
- model (string, default: "openai"): Model ID
- messages (array, required): [{role: "user"|"assistant"|"system", content: "..."}]
- stream (boolean, default: false): SSE streaming
- temperature (number, 0.0-2.0): Randomness
- seed (integer, default: 0): Reproducibility. -1 for random
- response_format ({type: "json_object"}): Force JSON output

### GET /text/{prompt}
Simple text generation. Returns plain text.
Query params: model, seed, system, json, temperature, stream

### GET /image/{prompt}
Generate image or video. Returns binary (image/jpeg or video/mp4).

Query params:
- model (string, default: "zimage"): Image or video model
- width (int, default: 1024), height (int, default: 1024)
- seed (int, default: 0): Works with flux, zimage, seedream, klein, seedance. -1 for random
- enhance (boolean, default: false): AI prompt enhancement
- negative_prompt (string): Only flux, zimage
- safe (boolean, default: false): Safety filter
- quality (low|medium|high|hd, default: "medium"): gptimage, gptimage-large
- image (string): Reference image URL(s), | or , separated
- transparent (boolean, default: false): gptimage, gptimage-large
- duration (int, 1-10): Video duration in seconds
- aspectRatio ("16:9"|"9:16"): Video only
- audio (boolean, default: false): Video audio. wan always has audio

### POST /v1/images/generations
OpenAI-compatible image generation. Use any OpenAI SDK with `base_url="https://gen.pollinations.ai/v1"`.

Request body (JSON):
- prompt (string, required): Text description of the image
- model (string, default: "flux"): Image model
- size (string, default: "1024x1024"): WIDTHxHEIGHT
- response_format ("url"|"b64_json", default: "b64_json"): Return format
- quality, seed, nologo, enhance, safe: Same as GET /image/{prompt}

### POST /v1/images/edits
OpenAI-compatible image editing. Accepts JSON with image URLs or multipart/form-data file uploads.

Request body (JSON or multipart):
- prompt (string, required): Description of the edit
- image (string or array): Source image URL(s)
- model (string, default: "flux"): Image model

### GET /audio/{text}
Text-to-speech or music generation. Returns audio/mpeg.
Query params: voice, model (elevenlabs|elevenmusic|acestep), duration

### POST /v1/audio/speech
OpenAI-compatible TTS. Body: {input, voice, model}

### POST /v1/audio/transcriptions
Speech-to-text. Multipart: file (audio), model (whisper-large-v3|scribe)

### GET /v1/models
List text models (OpenAI format). No auth required.

### GET /image/models
List image/video models with metadata. No auth required.

## Text Models

- openai: OpenAI GPT-5 Mini - Fast & Balanced [tools]
- openai-fast: OpenAI GPT-5 Nano - Ultra Fast & Affordable [tools]
- openai-large: OpenAI GPT-5.2 - Most Powerful & Intelligent [tools, reasoning] (paid)
- qwen-coder: Qwen3 Coder 30B - Specialized for Code Generation [tools]
- mistral: Mistral Small 3.2 24B - Efficient & Cost-Effective [tools]
- openai-audio: OpenAI GPT Audio Mini - Voice Input & Output [tools]
- openai-audio-large: OpenAI GPT Audio - Premium Voice Input & Output [tools] (paid)
- gemini: Google Gemini 3 Flash - Pro-Grade Reasoning at Flash Speed [tools, search, code-exec] (paid)
- gemini-flash-lite-3.1: Google Gemini 3.1 Flash Lite - Fast & Cost-Effective [tools, search, code-exec] (paid)
- gemini-fast: Google Gemini 2.5 Flash Lite - Ultra Fast & Cost-Effective [tools, search, code-exec]
- deepseek: DeepSeek V3.2 - Efficient Reasoning & Agentic AI [tools, reasoning]
- grok: xAI Grok 4.1 Fast - High Speed & Real-Time [tools] (paid)
- grok-reasoning: xAI Grok 4.1 Fast Reasoning - Chain-of-Thought Reasoning [tools, reasoning] (paid)
- gemini-search: Google Gemini 2.5 Flash Lite - With Google Search [search, code-exec]
- midijourney: MIDIjourney - AI Music Composition Assistant [tools]
- midijourney-large: MIDIjourney Large - Premium AI Music Composition [tools] (paid)
- claude-fast: Anthropic Claude Haiku 4.5 - Fast & Intelligent [tools]
- claude: Anthropic Claude Sonnet 4.6 - Most Capable & Balanced [tools] (paid)
- claude-large: Anthropic Claude Opus 4.6 - Most Intelligent Model [tools] (paid)
- perplexity-fast: Perplexity Sonar - Fast & Affordable with Web Search [search]
- perplexity-reasoning: Perplexity Sonar Reasoning - Advanced Reasoning with Web Search [reasoning, search]
- kimi: Moonshot Kimi K2.5 - Flagship Agentic Model with Vision & Multi-Agent [tools, reasoning]
- gemini-large: Google Gemini 3.1 Pro - Most Intelligent Model with 1M Context (Preview) [tools, reasoning, search] (paid)
- nova-fast: Amazon Nova Micro - Ultra Fast & Ultra Cheap [tools]
- nova: Amazon Nova 2 Lite - 1M Context with Reasoning [tools, reasoning] (paid)
- glm: Z.ai GLM-5 - 744B MoE, Long Context Reasoning & Agentic Workflows [tools, reasoning]
- minimax: MiniMax M2.5 - Coding, Agentic & Multi-Language [tools, reasoning]
- polly: Polly by @Itachi-1824 - Pollinations AI Assistant with GitHub, Code Search & Web Tools (Alpha) [tools, reasoning, search, code-exec] (alpha)
- qwen-coder-large: Qwen3 Coder Next - Advanced Code Generation via DashScope [tools] (paid)
- qwen-large: Qwen3.5 Plus - Alibaba Frontier MoE Model with Reasoning via DashScope [tools, reasoning]
- qwen-vision: Qwen3 VL Plus - Vision-Language Understanding with Reasoning via DashScope [tools, reasoning]
- qwen-safety: Qwen3Guard 8B - Content Safety & Moderation (OVH)

## Image Models

- kontext: FLUX.1 Kontext - In-context editing & generation (paid, image input)
- nanobanana: NanoBanana - Gemini 2.5 Flash Image (paid, image input)
- nanobanana-2: NanoBanana 2 - Gemini 3.1 Flash Image (paid, image input)
- nanobanana-pro: NanoBanana Pro - Gemini 3 Pro Image (4K, Thinking) (paid, image input)
- seedream5: Seedream 5.0 Lite - ByteDance ARK (web search, reasoning) (paid, image input)
- gptimage: GPT Image 1 Mini - OpenAI's image generation model (image input)
- gptimage-large: GPT Image 1.5 - OpenAI's advanced image generation model (paid, image input)
- flux: Flux Schnell - Fast high-quality image generation
- zimage: Z-Image Turbo - Fast 6B Flux with 2x upscaling
- wan-image: Wan 2.7 Image - Alibaba text-to-image and image editing (up to 2K) (image input)
- wan-image-pro: Wan 2.7 Image Pro - Alibaba text-to-image and editing (4K, thinking mode) (paid, image input)
- qwen-image: Qwen Image Plus - Alibaba text-to-image and image editing via DashScope (image input)
- grok-imagine: Grok Imagine - xAI official image generation (paid)
- grok-imagine-pro: Grok Imagine Pro - xAI official pro image generation (Aurora) (paid)
- klein: FLUX.2 Klein 4B - Fast image generation and editing via bpaigen (image input)
- p-image: Pruna p-image - Fast text-to-image generation (paid)
- p-image-edit: Pruna p-image-edit - Image-to-image editing (paid, image input)
- nova-canvas: Amazon Nova Canvas - Bedrock Image Generation & Editing (paid, image input)

## Video Models

- veo: Veo 3.1 Fast - Google's video generation model (preview) (paid)
- seedance: Seedance Lite - BytePlus video generation (better quality) (paid)
- seedance-pro: Seedance Pro-Fast - BytePlus video generation (better prompt adherence) (paid)
- wan: Wan 2.6 - Alibaba text/image-to-video with audio (2-15s, up to 1080P) via DashScope (paid)
- wan-fast: Wan 2.2 - Fast & cheap text/image-to-video (5s, 480P) via DashScope (paid)
- grok-video-pro: Grok Video Pro - xAI official video generation (720p, 1-15s) (paid)
- ltx-2: LTX-2.3 - Fast text-to-video generation with upscaler
- p-video: Pruna p-video - Text/image-to-video generation (up to 1080p) (paid)
- nova-reel: Amazon Nova Reel - Bedrock Video Generation (6-30s, 720p)

## Audio Models

- elevenlabs: ElevenLabs v3 TTS - Expressive voices with emotions & audio tags
- elevenmusic: ElevenLabs Music - Generate studio-grade music from text prompts
- whisper: Whisper Large V3 - Speech to Text Transcription (OVHcloud) (alpha)
- scribe: ElevenLabs Scribe v2 - Speech to Text (90+ languages, diarization)
- acestep: ACE-Step 1.5 Turbo — Fast open-source music generation with lyrics support (alpha)

## Available Voices (TTS)

alloy, echo, fable, onyx, nova, shimmer, ash, ballad, coral, sage, verse, rachel, domi, bella, elli, charlotte, dorothy, sarah, emily, lily, matilda, adam, antoni, arnold, josh, sam, daniel, charlie, james, fin, callum, liam, george, brian, bill

## Errors

JSON: {status, success: false, error: {code, message}}
- 400: Invalid parameters
- 401: Missing/invalid API key
- 402: Insufficient balance
- 403: Permission denied
- 500: Server error