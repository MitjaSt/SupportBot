import lib.elevenlabs as elevenlabs

if __name__ == "__main__":
    elevenlabs.text_to_speech(
        """
        A visual hallucination is the same experience as
        really seeing something, but the 'something' is not actually there.
    """.strip(),
        "tmp/voice/elevenlabs_tts.wav",
    )
