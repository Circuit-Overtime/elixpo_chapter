from typing import Optional
import asyncio
from dotenv import load_dotenv
from utility import encode_audio_base64, save_temp_audio, convertToAudio
from multiprocessing.managers import BaseManager
from intent import getContentRefined
import loggerConfig
load_dotenv()


class ModelManager(BaseManager): pass
ModelManager.register("Service")
manager = ModelManager(address=("localhost", 6000), authkey=b"secret")
manager.connect()
service = manager.Service()

async def generate_stt(text: str, audio_base64_path: str, requestID: str, system: Optional[str] = None, type: Optional[str] = "DIRECT") -> str:
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
        return transcription.strip()
    if intention == "REPLY":
        return content
    else:
        return transcription.strip()



if __name__ == "__main__":
    async def main():
        audio = "W8i19O5P6L.wav"
        base64_audio = encode_audio_base64(audio)
        saved_path = save_temp_audio(base64_audio, "223Req", "speech")
        audio_conv = convertToAudio(saved_path, "223Req")
        content = await generate_stt(
            text="Transcribe the audio",
            audio_base64_path=audio_conv,
            requestID="223Req",
            system=None,
        )
        print(f"Transcription result: {content}")
    asyncio.run(main())

        