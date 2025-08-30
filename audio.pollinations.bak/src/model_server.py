import multiprocessing as mp
import asyncio
from load_models import get_models

def model_worker(request_queue, response_queue):
    audio_model, transcribe_model = get_models()
    
    def run_async_synthesis(chat_template):
        from synthesis import synthesize_speech
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(synthesize_speech(chat_template, higgs_engine=audio_model))
        finally:
            loop.close()
    
    def run_async_transcription(audio_base64_path, reqID):
        from transcribe import transcribe_audio_from_base64
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(transcribe_audio_from_base64(audio_base64_path, reqID, higgs_engine=transcribe_model))
        finally:
            loop.close()
    
    while True:
        req = request_queue.get()
        if req == "STOP":
            break
        try:
            if req["type"] == "tts":
                audio_bytes = run_async_synthesis(req["chat_template"])
                response_queue.put({"id": req["id"], "result": audio_bytes})
            elif req["type"] == "transcribe":
                transcribed_text = run_async_transcription(req["audio_base64_path"], req["reqID"])
                response_queue.put({"id": req["id"], "result": transcribed_text})
            else:
                response_queue.put({"id": req["id"], "error": "Unknown request type"})
        except Exception as e:
            response_queue.put({"id": req["id"], "error": str(e)})