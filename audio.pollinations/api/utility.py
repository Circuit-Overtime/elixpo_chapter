import numpy as np
import base64
from loguru import logger
import os
import torch
from pydub import AudioSegment
import io
from typing import Optional



def normalize_text(text: str) -> str:
    chinese_to_english = {
        "\uff0c": ", ",
        "\u3002": ".",
        "\uff1a": ":",
        "\uff1b": ";",
        "\uff1f": "?",
        "\uff01": "!",
        "\uff08": "(",
        "\uff09": ")",
        "\u3010": "[",
        "\u3011": "]",
        "\u300a": "<",
        "\u300b": ">",
        "\u201c": '"',
        "\u201d": '"',
        "\u2018": "'",
        "\u2019": "'",
        "\u3001": ",",
        "\u2014": "-",
        "\u2026": "...",
        "\u00b7": "."
    }
    for zh, en in chinese_to_english.items():
        text = text.replace(zh, en)
    text = text.replace("(", " ").replace(")", " ")
    text = text.replace("\u00b0F", " degrees Fahrenheit")
    text = text.replace("\u00b0C", " degrees Celsius")
    tag_replacements = [
        ("[laugh]", "<SE>[Laughter]</SE>"),
        ("[music start]", "<SE_s>[Music]</SE_s>"),
        ("[music end]", "<SE_e>[Music]</SE_e>"),
        ("[applause]", "<SE>[Applause]</SE>"),
        ("[cough]", "<SE>[Cough]</SE>"),
    ]
    for tag, replacement in tag_replacements:
        text = text.replace(tag, replacement)
    lines = text.split("\n")
    text = "\n".join([" ".join(line.split()) for line in lines if line.strip()])
    text = text.strip()
    if text and not any(text.endswith(c) for c in [".", "!", "?", ",", ";", '"', "'", "</SE_e>", "</SE>"]):
        text += "."
    return text


def validate_and_decode_base64_audio(b64str, max_duration_sec=None):
    import base64, io, wave

    # Remove whitespace/newlines
    b64str = b64str.strip().replace('\n', '').replace('\r', '')

    # Fix padding if needed
    missing_padding = len(b64str) % 4
    if missing_padding:
        b64str += '=' * (4 - missing_padding)

    try:
        audio_bytes = base64.b64decode(b64str)
        with io.BytesIO(audio_bytes) as audio_io:
            with wave.open(audio_io, "rb") as wav_file:
                n_frames = wav_file.getnframes()
                framerate = wav_file.getframerate()
                duration = n_frames / float(framerate)
                if max_duration_sec and duration > max_duration_sec:
                    raise Exception(f"Audio duration {duration:.2f}s exceeds max allowed {max_duration_sec}s")
    except Exception as e:
        raise Exception(f"Invalid base64 WAV audio: {e}")

    # If no exception, return the original base64 string
    return b64str

def save_temp_audio(audio_data: str, req_id: str, usageType: str = "clone") -> str:
    if not audio_data:
        raise ValueError("Empty audio data")

    tmp_dir = f"/tmp/higgs/{req_id}"
    os.makedirs(tmp_dir, exist_ok=True)
    file_path = os.path.join(tmp_dir, f"voice_{req_id}.wav" if usageType == "clone" else f"speech_{req_id}.wav")

    with open(file_path, "w") as f:
        f.write(audio_data)
    logger.debug(f"Saved {len(audio_data)} bytes WAV to {file_path}")
    return file_path


def cleanup_temp_file(filepath: str):
    try:
        if filepath and os.path.exists(filepath):
            if os.path.isdir(filepath):
                # Remove all files and subdirectories
                for root, dirs, files in os.walk(filepath, topdown=False):
                    for name in files:
                        file_path = os.path.join(root, name)
                        os.unlink(file_path)
                        logger.debug(f"Cleaned up temp file: {file_path}")
                    for name in dirs:
                        dir_path = os.path.join(root, name)
                        os.rmdir(dir_path)
                        logger.debug(f"Cleaned up temp directory: {dir_path}")
                os.rmdir(filepath)
                logger.debug(f"Cleaned up temp directory: {filepath}")
            else:
                os.unlink(filepath)
                logger.debug(f"Cleaned up temp file: {filepath}")
    except Exception as e:
        logger.warning(f"Failed to cleanup {filepath}: {e}")


def set_random_seed(seed: Optional[int] = None):
    if seed is not None:
        torch.manual_seed(seed)
        np.random.seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed(seed)
            torch.cuda.manual_seed_all(seed)

def convertToAudio(audio_base64_path: str, reqID: str) -> str:
    with open(f"{audio_base64_path}", "r") as f:
        b64_audio = f.read()
    audio_bytes = base64.b64decode(b64_audio)
    audio_path = f"/tmp/higgs/{reqID}/converted_{reqID}.wav"
    with open(audio_path, "wb") as f:
        f.write(audio_bytes)
    return audio_path

def encode_audio_base64(audio_path: str) -> str:
    def is_base64(s: str) -> bool:
        try:
            if s.startswith("data:audio"):
                s = s.split(",")[1]
            base64.b64decode(s, validate=True)
            return True
        except Exception:
            return False

    def is_wav_bytes(data: bytes) -> bool:
        return data[:4] == b'RIFF' and data[8:12] == b'WAVE'

    # If input is base64 string
    if isinstance(audio_path, str) and (audio_path.startswith("data:audio") or is_base64(audio_path)):
        # Remove header if present
        b64_data = audio_path
        if audio_path.startswith("data:audio"):
            b64_data = audio_path.split(",")[1]
        audio_bytes = base64.b64decode(b64_data)
        if is_wav_bytes(audio_bytes):
            logger.info(f"Input base64 audio is already WAV format ({len(audio_bytes)} bytes)")
            return base64.b64encode(audio_bytes).decode("utf-8")
        else:
            # Convert to WAV using pydub
            try:
                audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
                buf = io.BytesIO()
                audio.export(buf, format="wav")
                wav_bytes = buf.getvalue()
                logger.info(f"Converted base64 audio to WAV format ({len(wav_bytes)} bytes)")
                return base64.b64encode(wav_bytes).decode("utf-8")
            except Exception as e:
                logger.error(f"Failed to convert base64 audio to WAV: {e}")
                raise ValueError("Invalid base64 audio data or unsupported format")
    else:
        # Assume it's a file path
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        if is_wav_bytes(audio_bytes):
            logger.info(f"Input file is already WAV format ({len(audio_bytes)} bytes)")
            return base64.b64encode(audio_bytes).decode("utf-8")
        else:
            try:
                audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
                buf = io.BytesIO()
                audio.export(buf, format="wav")
                wav_bytes = buf.getvalue()
                logger.info(f"Converted file audio to WAV format ({len(wav_bytes)} bytes)")
                return base64.b64encode(wav_bytes).decode("utf-8")
            except Exception as e:
                logger.error(f"Failed to convert file audio to WAV: {e}")
                raise ValueError("Invalid audio file or unsupported format")

if __name__ == "__main__":
    audio = "audio.wav"
    audio_b64 = encode_audio_base64(audio)
    savedAudioBase64 = save_temp_audio(audio_b64, "test_request", "clone")
    print(f"Saved location -- {savedAudioBase64}")