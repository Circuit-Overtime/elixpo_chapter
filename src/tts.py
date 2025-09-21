from templates import create_speaker_chat
from model_service import get_model_service
from systemInstruction import generate_higgs_system_instruction
from intent import getIntentType
from utility import encode_audio_base64, validate_and_decode_base64_audio, save_temp_audio
from voiceMap import VOICE_BASE64_MAP
import asyncio
from typing import Optional

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

    result = await getIntentType(text, system)
    intent_type = result.get("intent")
    content = result.get("content")
    print(intent_type)
    
    if intent_type not in ["DIRECT", 'REPLY']:
        intent_type = "DIRECT"
        
    if intent_type in ["DIRECT", "REPLY"]:
        if system is None:
            system = await generate_higgs_system_instruction(text)
        else:
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
        model_service = get_model_service()
        audio_bytes = await model_service.synthesize_speech_async(prepareChatTemplate)
        return audio_bytes

if __name__ == "__main__":
    import multiprocessing as mp
    from model_server import model_worker
    from model_service import init_model_service

    mp.set_start_method('spawn', force=True)
    request_queue = mp.Queue()
    response_queue = mp.Queue()
    worker_process = mp.Process(target=model_worker, args=(request_queue, response_queue))
    worker_process.start()
    init_model_service(request_queue, response_queue)

    async def main():
        text = "Such a beautiful day to start with!! What's on your mind?"
        requestID = "request123"
        system = None
        voice = "alloy"
        clone_text = None
        
        audio_bytes = await generate_tts(text, requestID, system, clone_text, voice)
        with open("output_reply.wav", "wb") as f:
            f.write(audio_bytes)
        print("Audio saved as output_reply.wav")
    
    asyncio.run(main())
    worker_process.terminate()