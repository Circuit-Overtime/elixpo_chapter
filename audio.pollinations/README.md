# Audio Pollinations

**Motto:**  
*Seamlessly bridging speech, semantics, and synthesis for creative audio intelligence.*

---

## Overview

Audio Pollinations is a modular Python framework for advanced audio processing, speech-to-text (STT), text-to-speech (TTS), and semantic audio understanding. It integrates state-of-the-art models and tools for building, serving, and experimenting with multimodal audio applications.

---

## Features

- **Speech Recognition (STT):** Accurate transcription of audio to text.
- **Speech Synthesis (TTS):** Natural-sounding voice generation from text.
- **Semantic Audio Processing:** Deep understanding and manipulation of audio content.
- **Modular Architecture:** Easily extend or swap components.
- **Distributed Model Server:** Dedicated model server for efficient resource management.
- **Server & API:** Ready-to-use server for deploying audio services.
- **Utilities & Tools:** Helpers for configuration, intent detection, and more.

---

## System Architecture

```mermaid
flowchart TB
    A[User/API Request] --> B[Flask App Server :8000]
    B --> C[Request Handler]
    C --> D{Request Type}
    
    D -- "TTS" --> E[TTS Module]
    D -- "STS" --> F[STS Module] 
    D -- "STT" --> G[STT Module]
    D -- "Transcribe" --> H[Transcribe Module]
    
    E --> I[Model Client]
    F --> I
    G --> I
    H --> I
    
    I --> J[HTTP Request]
    J --> K[Model Server :8001]
    
    K --> L{Model Type}
    L -- "Synthesize" --> M[Higgs Audio Engine]
    L -- "Transcribe" --> N[Whisper Model]
    
    M --> O[Audio Generation]
    N --> P[Text Transcription]
    
    O --> Q[HTTP Response]
    P --> Q
    Q --> R[Model Client Response]
    R --> S[Response Processing]
    S --> T[User/API Response]
    
    subgraph "Main Application (30 Workers)"
        B
        C
        D
        E
        F
        G
        H
        I
        S
    end
    
    subgraph "Model Server (1 Worker)"
        K
        L
        M
        N
        O
        P
    end
    
    style K fill:#e1f5fe
    style B fill:#f3e5f5
    style M fill:#fff3e0
    style N fill:#fff3e0
```

## Docker Structure

The project includes a Dockerfile for easy deployment and reproducibility. The Docker setup:

- **Base Image:** Uses `python:3.12-bullseye` for a stable Python environment.
- **System Dependencies:** Installs essential build tools and `ffmpeg` for audio processing.
- **Python Dependencies:** Installs all required Python packages from `requirements.txt`.
- **Source Code:** Copies the entire project into the container.
- **Dual Service Architecture:** 
  - **Model Server (Port 8001):** Single worker handling model inference
  - **Flask App (Port 8000):** 30 workers handling API requests
- **Resource Optimization:** Models loaded once in dedicated server, preventing memory duplication.

This structure ensures efficient resource utilization with models loaded once while maintaining high concurrency for API requests.

---
## API Endpoints

### Main Application Server (Port 8000)

### `/audio` Endpoint

#### `GET /audio`

Generate audio from text using optional system prompt and voice.

**Query Parameters:**

- `text` (string, required): The text to synthesize.
- `system` (string, optional): System prompt for context.
- `voice` (string, optional): Voice selection (e.g., `alloy`, `ballad`, `verse`). Default is `alloy`.

**Example:**

```bash
curl -X GET "http://localhost:8000/audio?text=Transcribe%20this%3A&system=optional_system_prompt&voice=alloy"
```

#### `POST /audio`

Flexible endpoint for advanced audio synthesis, voice cloning, speech input, and transcription.

**Request Body (JSON):**

```json
{
    "messages": [
        {
            "role": "system",
            "content": [
                { "type": "text", "text": "System instructions here" }
            ]
        },
        {
            "role": "user",
            "content": [
                { "type": "text", "text": "Your prompt text here" },
                {
                    "type": "voice",
                    "voice": { 
                        "name": "alloy", // or "ballad", "verse", etc.
                        "data": "<base64_audio_string>", 
                        "format": "wav"
                    }
                },
                {
                    "type": "clone_audio_transcript",
                    "audio_text": "Transcription or description of the reference audio"
                },
                {
                    "type": "speech_audio",
                    "audio": { "data": "<base64_audio_string>", "format": "wav" }
                }
            ]
        }
    ]
}
```

- To perform **voice cloning**, include a `voice` object with base64-encoded WAV data.
- To provide **reference audio transcription**, use `clone_audio_transcript`.
- For **speech input**, use `speech_audio` with base64-encoded WAV data.

**Example:**

```bash
curl -X POST http://localhost:8000/audio \
    -H "Content-Type: application/json" \
    -d '{
        "messages": [
            {
                "role": "system",
                "content": [
                    { "type": "text", "text": "System instructions here" }
                ]
            },
            {
                "role": "user",
                "content": [
                    { "type": "text", "text": "Your prompt text here" },
                    {
                        "type": "voice",
                        "voice": {
                            "name": "alloy",
                            "data": "<base64_audio_string>",
                            "format": "wav"
                        }
                    },
                    {
                        "type": "clone_audio_transcript",
                        "audio_text": "Transcription or description of the reference audio"
                    },
                    {
                        "type": "speech_audio",
                        "audio": { "data": "<base64_audio_string>", "format": "wav" }
                    }
                ]
            }
        ]
    }' --output output.wav
```

**Response:**  
- Returns a WAV audio file or a JSON object, depending on the request and processing result.

### Model Server (Port 8001)

The model server provides internal API endpoints for model inference:

#### `GET /health`
Health check endpoint for monitoring model server status.

#### `POST /synthesize`
Internal endpoint for audio synthesis using Higgs Audio Engine.

#### `POST /transcribe`
Internal endpoint for audio transcription using Whisper model.

**Modality Types:**
- **TTS:** Text-to-Speech (audio output)
- **STS:** Speech-to-Speech (audio output)
- **STT:** Speech-to-Text (text output)
- **TTT:** Text-to-Text (text output)

**Architecture Benefits:**
- **Resource Efficiency:** Models loaded once, preventing memory duplication across workers
- **High Concurrency:** 30 Flask workers handle API requests while 1 model server manages inference
- **Fault Isolation:** Model server failures don't crash the main application
- **Scalability:** Independent scaling of API and model servers

**Notes:**

- For voice cloning, include a `clone_audio` item with base64-encoded WAV audio.
- For speech input, include a `speech_audio` item with base64-encoded WAV audio.
- The response is a WAV audio file or a JSON object, depending on the request and processing result.

---

## License

Audio Pollinations is released under the GNU General Public License v3.0 (GPL-3.0). This license ensures that the project remains free and open-source, allowing anyone to use, modify, and distribute the software, provided that any derivative works are also distributed under the same license. For full details, see the [LICENSE](./LICENSE) file.

