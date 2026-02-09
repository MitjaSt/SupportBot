#!/bin/bash
# Test script for the complete voice pipeline

echo "Testing Voice Pipeline Services"
echo "================================"
echo

# Test 1: Whisper Health Check
echo "1. Testing Whisper STT service..."
WHISPER_HEALTH=$(curl -s http://localhost:3040/health)
echo "   Response: $WHISPER_HEALTH"
if echo "$WHISPER_HEALTH" | grep -q "ok"; then
    echo "   ✓ Whisper service is healthy"
else
    echo "   ✗ Whisper service failed"
    exit 1
fi
echo

# Test 2: Piper Health Check
echo "2. Testing Piper TTS service..."
PIPER_HEALTH=$(curl -s http://localhost:3050/health)
echo "   Response: $PIPER_HEALTH"
if echo "$PIPER_HEALTH" | grep -q "ok"; then
    echo "   ✓ Piper service is healthy"
else
    echo "   ✗ Piper service failed"
    exit 1
fi
echo

# Test 3: TTS Synthesis
echo "3. Testing TTS synthesis..."
TTS_OUTPUT=$(curl -s -X POST http://localhost:3050/synthesize \
    -H "Content-Type: application/json" \
    -d '{"text": "Hello, this is a test of the Piper text to speech system."}' \
    -o /tmp/test-piper-output.wav \
    -w "%{http_code}")

if [ "$TTS_OUTPUT" = "200" ]; then
    FILE_SIZE=$(stat -f%z /tmp/test-piper-output.wav 2>/dev/null || stat -c%s /tmp/test-piper-output.wav 2>/dev/null)
    echo "   ✓ TTS synthesis successful (generated ${FILE_SIZE} bytes)"
    echo "   Audio saved to: /tmp/test-piper-output.wav"
else
    echo "   ✗ TTS synthesis failed (HTTP $TTS_OUTPUT)"
    exit 1
fi
echo

echo "================================"
echo "All voice pipeline services are working!"
echo
echo "Next steps:"
echo "1. Start the NestJS API: cd projects/api && npm run start:dev"
echo "2. Start the frontend: cd projects/frontend && npm run dev"
echo "3. Click the microphone button to test voice input"
echo "4. Responses will be automatically spoken aloud"
