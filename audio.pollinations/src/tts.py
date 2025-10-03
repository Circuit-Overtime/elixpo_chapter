from templates import create_speaker_chat
from intent import getContentRefined
from utility import encode_audio_base64, validate_and_decode_base64_audio, save_temp_audio
from voiceMap import VOICE_BASE64_MAP
import asyncio
from typing import Optional
from multiprocessing.managers import BaseManager
import os
import threading
import time
import torch
import torchaudio
import io 

class ModelManager(BaseManager): pass
ModelManager.register("Service")
manager = ModelManager(address=("localhost", 6000), authkey=b"secret")
manager.connect()
service = manager.Service()

async def generate_tts(text: str, requestID: str, system: Optional[str] = None, clone_text: Optional[str] = None, voice: Optional[str] = "alloy") -> bytes:

    if voice and not VOICE_BASE64_MAP.get(voice):
        with open(voice, "r") as f:
            audio_data = f.read()
            if validate_and_decode_base64_audio(audio_data):
                clone_path = voice
    else:
        load_audio_path = VOICE_BASE64_MAP.get("alloy")
        base64_data = encode_audio_base64(load_audio_path)    
        clone_path = save_temp_audio(base64_data, requestID, "clone")

    result = await getContentRefined(text, system)
    intent_type = result.get("intent")
    content = result.get("content")
    

    if not system:
        system = result.get("system_instruction", "Provided externally")

    print(f"Intent: {intent_type}, Content: {content}, System: {system}")
    print(intent_type)
    
    if intent_type not in ["DIRECT", 'REPLY']:
        intent_type = "DIRECT"
        
    if intent_type in ["DIRECT", "REPLY"]:
        system = f"""
        "You are a voice synthesis engine. Speak the user's text exactly and only as written. Do not add extra words, introductions, or confirmations.\n"
        "Apply the emotions as written in the user prompt.\n"
        "Generate audio following instruction.\n"
        "<|scene_desc_start|>\n"
            {system}\n
        "<|scene_desc_end|>"
        """
        
    prepareChatTemplate = create_speaker_chat(
        text=content,
        requestID=requestID,
        system=system,
        clone_audio_path=clone_path,
        clone_audio_transcript=clone_text
    )
    print(f"Generating Audio for {requestID}")
    audio_numpy, audio_sample = service.speechSynthesis(chatTemplate=prepareChatTemplate)

    audio_tensor = torch.from_numpy(audio_numpy).unsqueeze(0)
    buffer = io.BytesIO()
    torchaudio.save(buffer, audio_tensor, audio_sample, format="wav")
    audio_bytes = buffer.getvalue()
    
    return audio_bytes, audio_sample

if __name__ == "__main__":
    class ModelManager(BaseManager): pass
    ModelManager.register("Service")
    manager = ModelManager(address=("localhost", 6000), authkey=b"secret")
    manager.connect()
    service = manager.Service()

    async def main():
        text = "Such a beautiful day to start with!! What's on your mind?"
        requestID = "request123"
        system = None
        voice = "alloy"
        clone_text = None
        
        def cleanup_cache():
            while True:
                try:
                    service.cleanup_old_cache_files()
                except Exception as e:
                    print(f"Cleanup error: {e}")

                time.sleep(600)

        cleanup_thread = threading.Thread(target=cleanup_cache, daemon=True)
        cleanup_thread.start()
        cache_name = service.cacheName(text)
        # if os.path.exists(f"genAudio/{cache_name}.wav"):
        #     print(f"Cache hit: genAudio/{cache_name}.wav already exists.")
        #     return
        
        audio_bytes, audio_sample = await generate_tts(text, requestID, system, clone_text, voice)
        torchaudio.save(f"{cache_name}.wav", torch.from_numpy(audio_bytes)[None, :], audio_sample)
        torchaudio.save(f"genAudio/{cache_name}.wav", torch.from_numpy(audio_bytes)[None, :], audio_sample)
        print(f"Audio saved as {cache_name}.wav")

    asyncio.run(main())
    