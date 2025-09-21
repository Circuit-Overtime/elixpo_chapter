from whisper import load_model
from boson_multimodal.serve.serve_engine import HiggsAudioServeEngine
from config import TRANSCRIBE_MODEL_SIZE, AUDIO_MODEL_PATH, AUDIO_TOKENIZER_PATH
import torch
from loguru import logger


_audio_model = None
_transcribe_model = None
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device: {device}")

def get_models():
    global _audio_model, _transcribe_model
    if _audio_model is None or _transcribe_model is None:
        _audio_model = HiggsAudioServeEngine(AUDIO_MODEL_PATH, AUDIO_TOKENIZER_PATH, device=device)
        _transcribe_model = load_model(TRANSCRIBE_MODEL_SIZE)
    return _audio_model, _transcribe_model
