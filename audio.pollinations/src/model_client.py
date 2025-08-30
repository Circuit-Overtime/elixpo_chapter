import aiohttp
import asyncio
import json
import base64
from loguru import logger
from typing import Optional
from boson_multimodal.data_types import ChatMLSample, Message, AudioContent
import threading

MODEL_SERVER_URL = "http://localhost:8001"

class ModelClient:
    def __init__(self, base_url: str = MODEL_SERVER_URL):
        self.base_url = base_url
        self._session = None
        self._lock = threading.Lock()
    
    async def get_session(self):
        """Get or create aiohttp session with proper event loop handling"""
        try:
            # Check if we have a session and if it's still valid
            if self._session is None or self._session.closed:
                with self._lock:
                    if self._session is None or self._session.closed:
                        # Create new session with timeout configuration
                        timeout = aiohttp.ClientTimeout(total=300, connect=30)
                        connector = aiohttp.TCPConnector(
                            limit=100,
                            limit_per_host=30,
                            ttl_dns_cache=300,
                            use_dns_cache=True,
                            keepalive_timeout=30
                        )
                        self._session = aiohttp.ClientSession(
                            timeout=timeout,
                            connector=connector
                        )
            return self._session
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            # Force create new session
            timeout = aiohttp.ClientTimeout(total=300, connect=30)
            connector = aiohttp.TCPConnector(
                limit=100,
                limit_per_host=30,
                ttl_dns_cache=300,
                use_dns_cache=True,
                keepalive_timeout=30
            )
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector
            )
            return self._session
    
    async def close(self):
        """Close the session properly"""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
    
    def serialize_chat_template(self, chat_template: ChatMLSample) -> str:
        """Serialize ChatMLSample to JSON string for HTTP transport"""
        def serialize_message(msg: Message):
            if isinstance(msg.content, str):
                content = msg.content
            elif isinstance(msg.content, list):
                # Handle AudioContent objects
                content = []
                for item in msg.content:
                    if isinstance(item, AudioContent):
                        content.append({
                            "type": "audio",
                            "raw_audio": item.raw_audio,
                            "audio_url": item.audio_url
                        })
                    else:
                        content.append(item)
            else:
                content = str(msg.content)
            
            return {
                "role": msg.role,
                "content": content
            }
        
        serialized_messages = [serialize_message(m) for m in chat_template.messages]
        return json.dumps(serialized_messages)
    
    async def synthesize_speech(self, chat_template: ChatMLSample, request_id: str) -> bytes:
        """Synthesize speech using the model server"""
        session = None
        try:
            # Get fresh session for each request to avoid event loop issues
            session = await self.get_session()
            
            # Serialize the chat template
            serialized_template = self.serialize_chat_template(chat_template)
            
            logger.info(f"Sending synthesis request for {request_id}")
            
            async with session.post(
                f"{self.base_url}/synthesize",
                json={
                    "chat_template": serialized_template,
                    "request_id": request_id
                },
                headers={'Content-Type': 'application/json'}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    # Decode base64 audio bytes
                    audio_b64 = result["audio_bytes"]
                    return base64.b64decode(audio_b64)
                else:
                    error_text = await response.text()
                    logger.error(f"Model server error ({response.status}): {error_text}")
                    raise Exception(f"Model server error ({response.status}): {error_text}")
                    
        except asyncio.TimeoutError:
            logger.error(f"Timeout synthesizing speech for {request_id}")
            raise Exception("Request timeout")
        except aiohttp.ClientError as e:
            logger.error(f"Client error synthesizing speech for {request_id}: {e}")
            # Close session on client error and retry once
            if session and not session.closed:
                await session.close()
                self._session = None
            raise Exception(f"HTTP client error: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to synthesize speech for {request_id}: {e}")
            raise
    
    async def transcribe_audio(self, audio_base64: str, request_id: str, model_size: str = "small") -> str:
        """Transcribe audio using the model server"""
        session = None
        try:
            session = await self.get_session()
            
            logger.info(f"Sending transcription request for {request_id}")
            
            async with session.post(
                f"{self.base_url}/transcribe",
                json={
                    "audio_base64": audio_base64,
                    "request_id": request_id,
                    "model_size": model_size
                },
                headers={'Content-Type': 'application/json'}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result["text"]
                else:
                    error_text = await response.text()
                    logger.error(f"Model server error ({response.status}): {error_text}")
                    raise Exception(f"Model server error ({response.status}): {error_text}")
                    
        except asyncio.TimeoutError:
            logger.error(f"Timeout transcribing audio for {request_id}")
            raise Exception("Request timeout")
        except aiohttp.ClientError as e:
            logger.error(f"Client error transcribing audio for {request_id}: {e}")
            # Close session on client error
            if session and not session.closed:
                await session.close()
                self._session = None
            raise Exception(f"HTTP client error: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to transcribe audio for {request_id}: {e}")
            raise

    def __del__(self):
        """Cleanup on destruction"""
        if self._session and not self._session.closed:
            try:
                asyncio.create_task(self._session.close())
            except:
                pass

# Create global client instance
model_client = ModelClient()

# Cleanup function for graceful shutdown
async def cleanup_model_client():
    await model_client.close()