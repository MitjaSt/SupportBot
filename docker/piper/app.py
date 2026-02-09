"""
Piper TTS Microservice
Provides /synthesize endpoint for text-to-speech conversion
"""
import os
import io
import wave
from flask import Flask, request, jsonify, send_file
from piper import PiperVoice

app = Flask(__name__)

# Initialize Piper voice model
VOICE_PATH = '/app/voices/en_US-lessac-medium.onnx'
print(f"Loading Piper voice model: {VOICE_PATH}")
voice = PiperVoice.load(VOICE_PATH)
print("Voice model loaded successfully")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'voice': 'en_US-lessac-medium'})


@app.route('/synthesize', methods=['POST'])
def synthesize():
    """
    Synthesize speech from text

    Expects JSON: { "text": "..." }
    Returns: WAV audio file
    """
    data = request.get_json()

    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400

    text = data['text']

    if not text or not text.strip():
        return jsonify({'error': 'Empty text'}), 400

    try:
        # Synthesize speech to bytes
        audio_bytes = io.BytesIO()

        # Create WAV file wrapper around BytesIO
        with wave.open(audio_bytes, 'wb') as wav_file:
            # Generate audio using Piper
            voice.synthesize(text, wav_file)

        # Reset buffer position
        audio_bytes.seek(0)

        # Return audio file
        return send_file(
            audio_bytes,
            mimetype='audio/wav',
            as_attachment=False,
            download_name='speech.wav'
        )

    except Exception as e:
        print(f"Error during synthesis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Run with gunicorn in production
    app.run(host='0.0.0.0', port=8001, debug=False)
