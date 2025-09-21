
import uuid
import asyncio
from typing import Optional

class ModelService:
    def __init__(self, request_queue, response_queue):
        self.request_queue = request_queue
        self.response_queue = response_queue
    
    async def synthesize_speech_async(self, chat_template) -> bytes:
        req_id = str(uuid.uuid4())
        request = {
            "id": req_id,
            "type": "tts",
            "chat_template": chat_template
        }
        
        self.request_queue.put(request)
        while True:
            try:
                response = self.response_queue.get(timeout=1)
                if response["id"] == req_id:
                    if "error" in response:
                        raise Exception(response["error"])
                    return response["result"]
            except:
                await asyncio.sleep(0.1)
    
    async def transcribe_audio_async(self, audio_base64_path: str, reqID: str) -> str:
        req_id = str(uuid.uuid4())
        request = {
            "id": req_id,
            "type": "transcribe",
            "audio_base64_path": audio_base64_path,
            "reqID": reqID
        }
        
        self.request_queue.put(request)
        
        while True:
            try:
                response = self.response_queue.get(timeout=1)
                if response["id"] == req_id:
                    if "error" in response:
                        raise Exception(response["error"])
                    return response["result"]
            except:
                await asyncio.sleep(0.1)

_model_service = None

def get_model_service():
    global _model_service
    return _model_service

def init_model_service(request_queue, response_queue):
    global _model_service
    _model_service = ModelService(request_queue, response_queue)