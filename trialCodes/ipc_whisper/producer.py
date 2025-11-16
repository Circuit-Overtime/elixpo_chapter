import whisper
from multiprocessing.managers import BaseManager

class WhisperWrapper:
    def __init__(self, model_name="small"):
        print("[Server] Loading Whisper model...")
        self.model = whisper.load_model(model_name)

    def transcribe(self, audio_path):
        print(f"[Server] Transcribing {audio_path} ...")
        result = self.model.transcribe(audio_path)
        return result["text"]


class WhisperManager(BaseManager): pass

if __name__ == "__main__":
    wrapper = WhisperWrapper()

    WhisperManager.register("WhisperService", callable=lambda: wrapper)
    manager = WhisperManager(address=("localhost", 5000), authkey=b"secret")
    server = manager.get_server()

    print("[Server] Whisper service running on port 5000...")
    server.serve_forever()
