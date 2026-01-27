import requests

from src.lib.env import env


def list_voices():
    url = "https://api.elevenlabs.io/v1/voices"
    headers = {"xi-api-key": env.elevenlabs.api_key}
    response = requests.get(url, headers=headers, timeout=2000)
    if response.status_code != 200:
        raise RuntimeError(response.text)
    voices = response.json()["voices"]
    result = "\n".join(f"{v['name']} -> {v['voice_id']}" for v in voices)
    return result


def text_to_speech(text: str, output_path: str, voice: str | None = None):
    """Convert text to speech using ElevenLabs API (no SDK)."""
    voice_id = voice or env.elevenlabs.voice_id

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {"xi-api-key": env.elevenlabs.api_key, "Content-Type": "application/json"}

    payload = {"text": text, "model": "eleven_monolingual_v2"}

    response = requests.post(url, headers=headers, json=payload, stream=True)

    if response.status_code != 200:
        raise RuntimeError(f"TTS API error: {response.text}")

    # Save streamed audio
    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                f.write(chunk)

    print(f"Saved audio to {output_path}")


def speech_to_text(audio_path):
    url = "https://api.elevenlabs.io/v1/speech-to-text"

    headers = {"xi-api-key": env.elevenlabs.api_key}

    with open(audio_path, "rb") as f:
        files = {
            "file": f  # MUST be named "file"
        }

        data = {"model_id": "scribe_v1"}

        response = requests.post(url, headers=headers, files=files, data=data)

    if response.status_code != 200:
        raise RuntimeError(response.text)

    return response.json()["text"]
