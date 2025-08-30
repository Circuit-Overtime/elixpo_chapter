from whisper import load_model
from boson_multimodal.serve.serve_engine import HiggsAudioServeEngine
from config import TRANSCRIBE_MODEL_SIZE, AUDIO_MODEL_PATH, AUDIO_TOKENIZER_PATH

_audio_model = None
_transcribe_model = None

def get_models():
    global _audio_model, _transcribe_model
    if _audio_model is None or _transcribe_model is None:
        _audio_model = HiggsAudioServeEngine(AUDIO_MODEL_PATH, AUDIO_TOKENIZER_PATH)
        _transcribe_model = load_model(TRANSCRIBE_MODEL_SIZE)
    return _audio_model, _transcribe_model
