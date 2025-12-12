import requests
import os
from dotenv import load_dotenv

load_dotenv()

ELEVEN_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")

def list_voices():
    url = "https://api.elevenlabs.io/v1/voices"
    headers = {"xi-api-key": ELEVEN_API_KEY}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise RuntimeError(response.text)
    voices = response.json()["voices"]
    result = "\n".join(
        f"{v['name']} -> {v['voice_id']}"
        for v in voices
    )
    return result


def text_to_speech(text: str, output_path: str, voice=ELEVENLABS_VOICE_ID):
    """Convert text to speech using ElevenLabs API (no SDK)."""

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"

    headers = {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "text": text,
        "model": "eleven_monolingual_v2"
    }

    response = requests.post(url, headers=headers, json=payload, stream=True)

    if response.status_code != 200:
        raise RuntimeError(f"TTS API error: {response.text}")

    # Save streamed audio
    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                f.write(chunk)

    print(f"🔊 Saved audio to {output_path}")


def speech_to_text(audio_path):
    url = "https://api.elevenlabs.io/v1/speech-to-text"

    headers = {
        "xi-api-key": ELEVEN_API_KEY
    }

    with open(audio_path, "rb") as f:
        files = {
            "file": f   # 👈 MUST be named "file"
        }

        data = {
            "model_id": "scribe_v1"
        }

        response = requests.post(
            url,
            headers=headers,
            files=files,
            data=data
        )

    if response.status_code != 200:
        raise RuntimeError(response.text)

    return response.json()["text"]

