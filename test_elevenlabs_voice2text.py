import requests
import os
import lib.elevenlabs as elevenlabs
from loguru import logger

if __name__ == "__main__":
    text = elevenlabs.speech_to_text("tmp/voice/WhatAreHallucinations.wav")
    logger.info("🗣️ User said:", text)

