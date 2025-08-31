from loguru import logger
from typing import Optional
import asyncio
from dotenv import load_dotenv
from systemInstruction import generate_higgs_system_instruction
from transcribe import transcribe_audio_from_base64
from utility import encode_audio_base64, save_temp_audio
from intent import getIntentType
import loggerConfig
load_dotenv()


async def generate_stt(text: str, audio_base64_path: str, requestID: str, system: Optional[str] = None, type: Optional[str] = "DIRECT") -> str:
    transcription = await transcribe_audio_from_base64(audio_base64_path, requestID)
    if system is None:
        system = await generate_higgs_system_instruction(text)
    else:
        system = f"""
        "You are a voice synthesis engine. Speak the user’s text exactly and only as written. Do not add extra words, introductions, or confirmations.\n"
        "Apply the emotions as written in the user prompt.\n"
        "Generate audio following instruction.\n"
        "<|scene_desc_start|>\n"
            {system}\n
        "<|scene_desc_end|>"
        """
    intention_detection = await getIntentType(f"This is the prompt and {text} and this is the audio transcript {transcription}", system)
    intention = intention_detection.get("intent")
    content = intention_detection.get("content")

    if intention == "DIRECT":
        return transcription.strip()
    if intention == "REPLY":
        return content
    else:
        return transcription.strip()



if __name__ == "__main__":
    async def main():
        audio = "sample.wav"
        base64_audio = encode_audio_base64(audio)
        saved_path = save_temp_audio(base64_audio, "223Req", "speech")
        content = await generate_stt(
            text="is this a true fact?",
            audio_base64_path=saved_path,
            requestID="223Req",
            system=None,
        )
        print(f"Transcription result: {content}")
    asyncio.run(main())

        