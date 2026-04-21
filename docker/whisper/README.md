# Whisper STT Microservice

Local speech-to-text service using OpenAI's Whisper model, dockerized for easy deployment.

## Quick Start

```bash
# Start the Whisper service
cd docker
docker-compose up -d whisper

# Check if it's running
curl http://localhost:8000/health
```

## Usage

### From Command Line

```bash
# Transcribe an audio file
curl -X POST http://localhost:8000/transcribe \
  -F "audio=@recording.wav" \
  | jq

# Response:
# {
#   "text": "What is dry AMD?",
#   "language": "en",
#   "language_probability": 0.95
# }
```

### From NestJS API

The service is automatically integrated with the chat API:

```bash
# Upload audio and get text response
curl -X POST http://localhost:3000/api/chat/query/voice \
  -F "audio=@recording.wav" \
  -F "sessionId=optional-session-id"
```

## Configuration

Environment variables in `docker-compose.whisper.yml`:

```yaml
environment:
  WHISPER_MODEL: base        # tiny, base, small, medium, large-v3
  WHISPER_DEVICE: cpu        # cpu or cuda (for GPU)
  WHISPER_COMPUTE_TYPE: int8 # int8 (CPU), float16 (GPU)
```

## Model Sizes

| Model  | Size  | Speed (CPU) | Accuracy | Use Case              |
|--------|-------|-------------|----------|-----------------------|
| tiny   | 75MB  | ~0.5s       | Good     | Very fast, basic      |
| base   | 145MB | ~1s         | Better   | **Recommended**       |
| small  | 485MB | ~3s         | Great    | High accuracy         |
| medium | 1.5GB | ~8s         | Excellent| Professional use      |
| large  | 3GB   | ~15s        | Best     | Maximum accuracy      |

**Recommendation:** Use `base` for real-time applications (good balance of speed/accuracy).

## GPU Support

To use GPU acceleration (much faster):

1. Install NVIDIA Docker runtime
2. Uncomment GPU section in `docker-compose.whisper.yml`
3. Change environment:
   ```yaml
   WHISPER_DEVICE: cuda
   WHISPER_COMPUTE_TYPE: float16
   ```

## Supported Audio Formats

- WAV
- MP3
- OGG
- WEBM
- M4A
- FLAC

## Architecture

```
Frontend (mic) → NestJS API → Whisper Docker → Text → RAG Pipeline → Response
```

## API Endpoints

### `GET /health`
Health check

**Response:**
```json
{
  "status": "ok",
  "model": "base"
}
```

### `POST /transcribe`
Transcribe audio file

**Request:**
- Content-Type: `multipart/form-data`
- Field: `audio` (audio file)

**Response:**
```json
{
  "text": "transcribed text here",
  "language": "en",
  "language_probability": 0.95
}
```

## Performance

**Base model on typical CPU:**
- Latency: ~1-2 seconds for 10s audio
- Memory: ~500MB RAM
- CPU: 2-4 cores recommended

**With GPU (CUDA):**
- Latency: ~0.3-0.5 seconds
- Memory: ~2GB VRAM

## Troubleshooting

**Service won't start:**
```bash
# Check logs
docker logs rag-whisper

# Rebuild if needed
docker-compose build whisper
docker-compose up -d whisper
```

**Slow transcription:**
- Switch to smaller model (`tiny`)
- Enable GPU support
- Upgrade CPU/RAM

**Audio not recognized:**
- Check file format (use WAV for best compatibility)
- Ensure audio is clear with minimal background noise
- Try converting to WAV: `ffmpeg -i input.mp3 output.wav`

## Development

Test the service directly:

```python
# test_whisper.py
import requests

with open('test.wav', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/transcribe',
        files={'audio': f}
    )
    print(response.json())
```

## Next Steps

To add TTS (text-to-speech) for complete voice pipeline:
- Add Piper TTS service (similar Docker setup)
- Create `/synthesize` endpoint
- Stream audio responses back to frontend
