AUDIO_MODEL_PATH = "bosonai/higgs-audio-v2-generation-3B-base"
AUDIO_TOKENIZER_PATH = "bosonai/higgs-audio-v2-tokenizer"
SAMPLE_RATE = 24000
MAX_FILE_SIZE_MB = 5
MAX_CONCURRENT_REQUESTS = 50
chat_ml_sample = (
    "Generate audio following instruction.\n\n"
    "<|scene_desc_start|>\n"
    "A cheerful room full of energy, with a warm and friendly tone."
    "<|scene_desc_end|>"
)

DEFAULT_SYSTEM_PROMPT = (
    "Generate audio following instruction.\n\n"
    "<|scene_desc_start|>\n"
    "Audio is recorded from a quiet room.\n"
    "<|scene_desc_end|>"
)

DEFAULT_STOP_STRINGS = ["<|end_of_text|>", "<|eot_id|>"]
TEMP_SAVE_DIR = "/tmp/higgs/"
MAX_CACHE_SIZE_MB = 500 
MAX_CACHE_FILES = 100    
TRANSCRIBE_MODEL_SIZE = "small"
MAX_CONCURRENT_OPERATIONS = 5 #FOR THE CONCURRENT GPU USAGE