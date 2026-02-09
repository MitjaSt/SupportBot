"""
Whisper STT Microservice
Provides /transcribe endpoint for audio-to-text conversion
"""
import os
import tempfile
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

app = Flask(__name__)

# Initialize Whisper model (base for good balance of speed/accuracy)
# Model: tiny, base, small, medium, large-v2, large-v3
MODEL_SIZE = os.getenv('WHISPER_MODEL', 'base')
DEVICE = os.getenv('WHISPER_DEVICE', 'cpu')  # 'cpu' or 'cuda'
COMPUTE_TYPE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')  # int8, float16, float32

print(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE} with {COMPUTE_TYPE}")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Model loaded successfully")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'model': MODEL_SIZE})


@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio file to text

    Expects multipart/form-data with 'audio' file
    Returns JSON: { "text": "...", "language": "en" }
    """
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']

    if audio_file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    # Save to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Transcribe
        segments, info = model.transcribe(
            tmp_path,
            beam_size=5,
            language='en',  # Force English (change if needed)
            task='transcribe'
        )

        # Combine all segments
        text = ' '.join([segment.text for segment in segments])

        return jsonify({
            'text': text.strip(),
            'language': info.language,
            'language_probability': info.language_probability
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == '__main__':
    # Run with gunicorn in production
    app.run(host='0.0.0.0', port=8000, debug=False)
