# Voice Pipeline

This document describes the complete voice interaction pipeline implemented in the Macular Society RAG application.

## Overview

The voice pipeline enables users to:
1. **Ask questions using their microphone** (Speech-to-Text)
2. **Receive spoken answers** (Text-to-Speech)

This creates a fully hands-free, accessible experience for users with visual impairments.

## Architecture

```
User speaks → Whisper STT → RAG Query → LLM Response → Piper TTS → Audio Playback
```

### Components

#### 1. Whisper STT (Speech-to-Text)
- **Service**: Dockerized Python service using `faster-whisper`
- **Location**: `docker/whisper/`
- **Port**: 3040
- **Model**: `base.en` (English, fast inference)
- **Endpoint**: `POST /transcribe` (accepts audio file, returns text)

#### 2. Piper TTS (Text-to-Speech)
- **Service**: Dockerized Python service using `piper-tts`
- **Location**: `docker/piper/`
- **Port**: 3050
- **Voice**: `en_US-lessac-medium` (natural female voice)
- **Endpoint**: `POST /synthesize` (accepts text, returns WAV audio)

#### 3. NestJS Integration
- **WhisperService** (`projects/api/src/modules/whisper/`)
  - Communicates with Whisper Docker service
  - Handles audio file uploads and transcription

- **PiperService** (`projects/api/src/modules/piper/`)
  - Communicates with Piper Docker service
  - Synthesizes text responses to speech

- **ChatController** endpoints:
  - `POST /chat/query/voice` - Voice query with transcription
  - `POST /chat/synthesize` - Text-to-speech synthesis

#### 4. Frontend Integration
- **Microphone button** in ChatInput component
- **Recording indicator** with pulsing animation
- **Web Audio API** for recording (MediaRecorder)
- **Automatic TTS playback** for all assistant responses

## Usage

### Starting the Services

```bash
# Start all services including Whisper and Piper
cd docker
docker-compose up -d

# Verify services are running
docker-compose ps

# Check service health
curl http://localhost:3040/health  # Whisper
curl http://localhost:3050/health  # Piper
```

### Frontend Voice Interaction

1. Click the **microphone icon** in the chat input
2. Speak your question
3. Click the **stop icon** to finish recording
4. The question is transcribed and sent automatically
5. The assistant's response is displayed and spoken aloud

### API Usage

#### Voice Query
```typescript
// Send audio and get transcription + response
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');
formData.append('sessionId', sessionId);

const response = await fetch('/api/chat/query/voice', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
// {
//   sessionId: string,
//   query: string,
//   answer: string,
//   sources: [...],
//   transcription: {
//     text: string,
//     language: string
//   }
// }
```

#### Text-to-Speech
```typescript
// Synthesize text to audio
const response = await fetch('/api/chat/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Your text here' }),
});

const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
await audio.play();
```

## Configuration

### Environment Variables

All voice services are configured via `.env`:

```bash
# Whisper STT Service
WHISPER_URL="http://localhost:3040"

# Piper TTS Service
PIPER_URL="http://localhost:3050"
```

### Docker Configuration

Services are defined in:
- `docker/docker-compose.whisper.yml`
- `docker/docker-compose.piper.yml`

Both are included in the main `docker/docker-compose.yml`.

## Technical Details

### Audio Format Support

**Whisper STT** accepts:
- `.webm` (browser MediaRecorder default)
- `.wav`
- `.mp3`
- `.m4a`

**Piper TTS** outputs:
- `.wav` (16kHz, 16-bit PCM)

### Performance

- **Whisper transcription**: ~1-3 seconds for typical questions
- **Piper synthesis**: ~0.5-1 second for typical responses
- **Model sizes**:
  - Whisper base.en: ~150MB
  - Piper en_US-lessac-medium: ~63MB

### Browser Compatibility

Voice recording requires:
- Modern browser with `getUserMedia()` support
- HTTPS or localhost (required for microphone access)
- MediaRecorder API support

Supported browsers:
- Chrome/Edge 49+
- Firefox 25+
- Safari 14.1+

## Troubleshooting

### Whisper service not responding
```bash
# Check logs
docker-compose logs whisper

# Restart service
docker-compose restart whisper
```

### Piper service not responding
```bash
# Check logs
docker-compose logs piper

# Restart service
docker-compose restart piper
```

### Microphone permission denied
- Ensure the application is served over HTTPS or localhost
- Check browser permissions for microphone access
- Try in an incognito/private window

### No audio playback
- Check browser console for errors
- Verify Piper service is running
- Check browser audio permissions
- Ensure speakers/headphones are connected

## Future Enhancements

Potential improvements:
- [ ] Streaming TTS for real-time audio playback
- [ ] Voice activity detection (stop recording on silence)
- [ ] Speaker selection for TTS (male/female voices)
- [ ] Language selection for multilingual support
- [ ] Audio waveform visualization during recording
- [ ] Playback controls (pause, replay, speed adjustment)
