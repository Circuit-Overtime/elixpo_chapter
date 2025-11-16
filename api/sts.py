from utility import encode_audio_base64, save_temp_audio, validate_and_decode_base64_audio, convertToAudio
from templates import create_speaker_chat
from multiprocessing.managers import BaseManager
from voiceMap import VOICE_BASE64_MAP
from typing import Optional
import asyncio
import loggerConfig
import torchaudio
import torch 
from intent import getContentRefined
import io

class ModelManager(BaseManager): pass
ModelManager.register("Service")
manager = ModelManager(address=("localhost", 6000), authkey=b"secret")
manager.connect()
service = manager.Service()


async def generate_sts(text: str, audio_base64_path: str, requestID: str, system: Optional[str] = None, clone_text: Optional[str] = None, voice: Optional[str] = "alloy") -> bytes:
    
    if voice and not VOICE_BASE64_MAP.get(voice):
        with open(voice, "r") as f:
            audio_data = f.read()
            if validate_and_decode_base64_audio(audio_data):
                clone_path = voice
    else:
        load_audio_path = VOICE_BASE64_MAP.get("alloy")
        base64_data = encode_audio_base64(load_audio_path)    
        clone_path = save_temp_audio(base64_data, requestID, "clone")  

        
    transcription = service.transcribe(audio_base64_path, requestID)
    intention_detection = await getContentRefined(f"This is the prompt and {text} and this is the audio transcript {transcription}", system)
    intention = intention_detection.get("intent")
    content = intention_detection.get("content")
    if system is None:
        system = intention_detection.get("system_instruction", "Provided externally")
    system = f"""
        "You are a voice synthesis engine. Speak the user’s text exactly and only as written. Do not add extra words, introductions, or confirmations.\n"
        "Apply the emotions as written in the user prompt.\n"
        "Generate audio following instruction.\n"
        "<|scene_desc_start|>\n"
            {system}\n
        "<|scene_desc_end|>"
        """

    if intention == "DIRECT":
        prepareChatTemplate = create_speaker_chat(
        text=transcription.strip(),
        requestID=requestID,
        system=system,
        clone_audio_path=clone_path,
    )
    elif intention == "REPLY":
        prepareChatTemplate = create_speaker_chat(
        text=content,
        requestID=requestID,
        system=system,
        clone_audio_path=clone_path,
        )
    
    audio_numpy, audio_sample = service.speechSynthesis(chatTemplate=prepareChatTemplate)
    
    # Convert numpy array to bytes
    audio_tensor = torch.from_numpy(audio_numpy).unsqueeze(0)
    buffer = io.BytesIO()
    torchaudio.save(buffer, audio_tensor, audio_sample, format="wav")
    audio_bytes = buffer.getvalue()
    
    # Add the missing return statement
    return audio_bytes, audio_sample


if __name__ == "__main__":
    async def main():
        text = "How do you feel about this?"
        audio = "W8i19O5P6L.wav"

        
        base64_audio = encode_audio_base64(audio)
        saved_audio_path = save_temp_audio(base64_audio, "request224", "speech")
        audio_conv = convertToAudio(saved_audio_path, "request224")
        requestID = "request123"
        system = None
        clone_text = None
        voice = None

        audio_bytes, sample_rate = await generate_sts(text, audio_conv, requestID, system, clone_text, voice)
        torchaudio.save(f"{requestID}.wav", torch.from_numpy(audio_bytes)[None, :], sample_rate)
        
    
    asyncio.run(main())