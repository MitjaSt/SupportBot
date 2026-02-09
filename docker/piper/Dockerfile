# Piper TTS Microservice
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Piper TTS
RUN pip install --no-cache-dir piper-tts==1.2.0

# Download voice model (en_US-lessac-medium - clear, professional)
# Other options: amy-medium, ljspeech-medium, lessac-high
RUN mkdir -p /app/voices && \
    cd /app/voices && \
    wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx && \
    wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

# Install Flask dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Expose port
EXPOSE 8001

# Run the service
CMD ["python", "app.py"]
