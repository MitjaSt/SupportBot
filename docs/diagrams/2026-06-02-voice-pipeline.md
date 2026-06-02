# Voice pipeline

> Source: projects/api/src/modules/chat/chat.controller.ts, whisper/, piper/, docs/VOICE_PIPELINE.md | Type: sequenceDiagram | Date: 2026-06-02
> Edit online: paste the code block below into https://mermaid.live

## Full voice query — microphone to spoken answer

```mermaid
sequenceDiagram
  participant User
  participant Browser
  participant API as NestJS API
  participant Whisper as Whisper service<br/>(Docker :3040)
  participant Chat as ChatService
  participant Piper as Piper service<br/>(Docker :3050)

  User->>Browser: clicks mic icon
  Browser->>Browser: MediaRecorder.start()<br/>(getUserMedia, audio/webm)
  User->>Browser: clicks stop icon
  Browser->>Browser: MediaRecorder.stop()<br/>collect Blob chunks

  Browser->>+API: POST /chat/query/voice?sessionId=…<br/>Content-Type: audio/webm<br/>Body: raw audio binary
  API->>API: detect ext from Content-Type<br/>(webm / ogg / wav / mp3 / m4a)

  API->>+Whisper: POST /transcribe<br/>multipart: audio=<blob> recording.webm
  Note over Whisper: faster-whisper<br/>model: base.en
  Whisper-->>-API: { text, language, languageProbability }

  API->>+Chat: chat(sessionId, transcription.text)
  Note over Chat: full RAG pipeline<br/>(see retrieval-flow diagram)
  Chat-->>-API: QueryResponse { answer, sources, … }

  API-->>-Browser: 200 JSON<br/>{ answer, sources, sessionId,<br/>  transcription: { text, language } }

  Browser->>+API: POST /chat/synthesize<br/>{ text: answer }
  API->>+Piper: POST /synthesize<br/>{ text }
  Note over Piper: piper-tts<br/>voice: en_US-lessac-medium
  Piper-->>-API: WAV buffer (16kHz, 16-bit PCM)
  API-->>-Browser: audio/wav binary

  Browser->>Browser: URL.createObjectURL(blob)
  Browser->>User: new Audio(url).play()
```

## TTS-only path (`POST /chat/synthesize`)

```mermaid
sequenceDiagram
  participant Browser
  participant API as NestJS API
  participant Piper as Piper service<br/>(Docker :3050)

  Browser->>+API: POST /chat/synthesize<br/>{ text: "…" }
  API->>+Piper: POST /synthesize { text }
  Piper-->>-API: WAV buffer
  API-->>-Browser: Content-Type: audio/wav<br/>Content-Length: <n>
  Browser->>Browser: play WAV
```

## Audio format routing

```mermaid
flowchart LR
  REC[Browser MediaRecorder\naudio/webm default] --> SEND[POST /chat/query/voice\nraw binary body]
  SEND --> EXT{Content-Type header}
  EXT -- audio/ogg --> OGG[recording.ogg]
  EXT -- audio/mp4 --> M4A[recording.m4a]
  EXT -- audio/mpeg --> MP3[recording.mp3]
  EXT -- audio/wav --> WAV[recording.wav]
  EXT -- other/default --> WEBM[recording.webm]
  OGG & M4A & MP3 & WAV & WEBM --> WH[Whisper\n/transcribe]
```

## Notes

- **No multipart on the API** — audio is sent as a raw binary body to avoid `@fastify/multipart`; `sessionId` travels as a query param.
- **Whisper** receives a FormData blob; the filename extension tells it the container format. Model `base.en` gives ~1–3 s latency for typical questions.
- **Piper** responds synchronously with a full WAV buffer (~0.5–1 s). Streaming TTS is a noted future enhancement.
- **Voice query is non-streaming** — the chat answer is buffered so it can be returned alongside the transcription in one JSON response, then synthesized in a separate request.
- Both voice services require HTTPS or localhost due to browser `getUserMedia` restrictions.
