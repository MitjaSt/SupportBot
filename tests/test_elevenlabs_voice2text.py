from loguru import logger

import src.lib.elevenlabs as elevenlabs

if __name__ == "__main__":
    text = elevenlabs.speech_to_text("tmp/voice/WhatAreHallucinations.wav")
    logger.info("🗣️ User said:", text)
