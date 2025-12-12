import requests
import os
import lib.elevenlabs as elevenlabs

if __name__ == "__main__":
    print(f"Available voices: \n\n{elevenlabs.list_voices()}\n")

