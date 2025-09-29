# whisper_client.py
from multiprocessing.managers import BaseManager

class WhisperManager(BaseManager): pass

if __name__ == "__main__":
    WhisperManager.register("WhisperService")

    manager = WhisperManager(address=("localhost", 8002), authkey=b"secret")
    manager.connect()

    service = manager.WhisperService()

    # Example: transcribe an audio file
    text = service.transcribe("sample.wav")
    print("[Client] Transcription:", text)
