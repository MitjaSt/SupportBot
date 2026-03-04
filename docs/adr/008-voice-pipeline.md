# ADR-008: Self-Hosted Voice Pipeline (Whisper STT + Piper TTS)

**Status:** Accepted

## Context

We want to support voice input and voice output to make the chatbot accessible to users with low vision or limited dexterity. There are two ways to do this: use cloud APIs (OpenAI Whisper API, OpenAI TTS, ElevenLabs, etc.) or run open-source models locally in Docker containers.

## Decision

Run **faster-whisper** (speech-to-text) and **Piper** (text-to-speech) as **self-hosted Docker services**. Whisper listens on port 3040; Piper on port 3050. The API communicates with them over the internal Docker network.

## Rationale

**Self-hosted over cloud APIs:**
- Cost: cloud TTS/STT APIs charge per character or per second of audio; self-hosting has zero marginal cost per request once the infrastructure is running
- Privacy: audio from potentially vulnerable users never leaves the deployment environment; this aligns with the charity's data governance obligations
- Latency: intra-Docker network calls are faster and more predictable than round trips to external APIs
- Independence: no exposure to third-party API pricing changes, rate limits, or deprecation cycles

**faster-whisper over OpenAI's hosted Whisper API:**
- Same underlying model (Whisper base.en for English) with comparable accuracy
- CTranslate2 backend is significantly faster than the original PyTorch Whisper on CPU

**Piper over cloud TTS:**
- Piper's `en_US-lessac-medium` voice is natural-sounding and specifically trained for English
- Produces WAV output directly — no codec conversion needed before sending to the browser

**No streaming TTS:**
- Audio is played only after the full text response is generated and the stream has completed
- Streaming TTS would require chunking the text at sentence boundaries and stitching audio segments on the client, which adds complexity for modest UX gain given typical response lengths
- This can be revisited if response latency increases significantly

## Consequences

- The deployment must include two additional Docker services (`whisper`, `piper`); local development requires Docker Compose to be running
- Whisper `base.en` is English-only; supporting other languages requires upgrading to a multilingual model, which has higher CPU/memory requirements
- Audio is accepted as raw binary from the browser (`MediaRecorder` with `audio/webm` format); the Whisper service handles transcoding internally
- If self-hosting becomes operationally burdensome (GPU availability, maintenance), migrating to cloud APIs is straightforward — the integration is isolated to `SpeechService`
