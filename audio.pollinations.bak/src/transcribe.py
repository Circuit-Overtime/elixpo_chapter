import base64
import os
from model_service import get_model_service
from loguru import logger
import asyncio

async def transcribe_audio_from_base64(synthesis_audio_path: str, reqID: str, model_size: str = "small", higgs_engine=None) -> str:
    logger.info(f"Transcribing audio from base64 file: {synthesis_audio_path} for request ID: {reqID} using model size: {model_size}")
    
    if higgs_engine:
        # Direct model usage (for model_server.py)
        with open(synthesis_audio_path, "r") as f:
            b64_audio = f.read().strip()
        tmp_dir = f"/tmp/higgs/{reqID}"
        os.makedirs(tmp_dir, exist_ok=True)
        audio_path = os.path.join(tmp_dir, f"transcribe_{reqID}.wav")
        with open(audio_path, "wb") as f:
            f.write(base64.b64decode(b64_audio))
        
        result = higgs_engine.transcribe(audio_path)
        return result["text"]
    else:
        # Use model service
        model_service = get_model_service()
        return await model_service.transcribe_audio_async(synthesis_audio_path, reqID)

if __name__ == "__main__":
    async def main():
        reqID = "test_request"
        synthesis_audio_path = "/tmp/higgs/test_request/voice_test_request.txt"
        text = await transcribe_audio_from_base64(synthesis_audio_path, reqID, model_size="small")
        print("\n--- Transcription ---\n")
        print(text)
    
    asyncio.run(main())