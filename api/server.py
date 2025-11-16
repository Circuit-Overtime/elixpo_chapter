import requests
import json
import os
import random
import logging
import asyncio
import shutil
from typing import Optional
import torch
import torchaudio
from tools import tools
from config import TEMP_SAVE_DIR
from utility import encode_audio_base64, save_temp_audio, cleanup_temp_file, validate_and_decode_base64_audio
from requestID import reqID
from voiceMap import VOICE_BASE64_MAP
from tts import generate_tts
from ttt import generate_ttt
from sts import generate_sts
from stt import generate_stt


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("elixpo-audio")

POLLINATIONS_TOKEN = os.getenv("POLLI_TOKEN")
MODEL = os.getenv("MODEL")
REFERRER = os.getenv("REFERRER")
POLLINATIONS_ENDPOINT = "https://enter.pollinations.ai/api/generate/v1/chat/completions"


async def run_audio_pipeline(
    reqID: str = None,
    text: str = None,
    voice: str = None,
    synthesis_audio_path: Optional[str] = None, 
    clone_audio_transcript: Optional[str] = None,
    system_instruction: Optional[str] = None 
):
    
    print(f"Recieved the parameters: {reqID}, {text}, {voice}, {synthesis_audio_path}, {clone_audio_transcript}, {system_instruction}")
    logger.info(f" [{reqID}] Starting Audio Pipeline")
    logger.info(f"Synthesis audio {synthesis_audio_path} | Clone Audio {voice}")
    higgs_dir = f"/tmp/higgs/{reqID}"
    os.makedirs(higgs_dir, exist_ok=True)
    logger.info(f"[{reqID}] Created higgs directory: {higgs_dir}")    
    logger.info(f"[{reqID}] Saved base64 for the required media")

    try:
        messages = [
            {
                "role": "system",
"content": """
You are Elixpo Audio, an advanced audio synthesis agent that routes requests to the correct pipeline.

Available Functions:
- generate_tts(text, requestID, system, clone_text, voice)
- generate_ttt(text, requestID, system)
- generate_sts(text, synthesis_audio_path, requestID, system, clone_text, voice)
- generate_stt(text, synthesis_audio_path, requestID, system)

Available Pipelines:
- TTS (Text-to-Speech): Convert text to audio
- TTT (Text-to-Text): Generate text responses
- STS (Speech-to-Speech): Convert speech input to speech output
- STT (Speech-to-Text): Convert speech input to text output

Hard Rules (Very Important):
- Only use TTT if the user explicitly requests a text response (e.g., “write”, “write me a script”, “generate a script”, “give me text”, “reply in text”, “text only”, “show me the words”, “don’t speak”, “no audio”).
- Only use STT if the user explicitly requests a textual transcript/response of their audio (e.g., “transcribe”, “give me the text”, “show me words”, “write what I said”, “text only”, “no audio”).
- Otherwise, DO NOT choose TTT or STT.
- Default behavior: 
  - If input is text-only (no synthesis_audio_path) → TTS by default.
  - If input includes speech (synthesis_audio_path provided) → STS by default.
- Always pass arguments exactly as provided; do not modify or omit parameters.
- Always pass voice_path (if provided) to the `voice` parameter of TTS/STS calls.

Decision Logic:

1) If a synthesis_audio_path is provided (user gave speech):
   - If the instruction explicitly requests a TEXTUAL output (keywords like: transcribe, text, transcript, write, show words, captions, subtitles, “reply in text”, “no audio”, “text only”) → use STT.
   - Else → use STS (default).

2) If no synthesis_audio_path is provided (user input is text):
   - If the instruction explicitly requests a TEXTUAL reply ONLY (keywords like: write, script, generate text, “reply in text”, “text only”, “don’t speak”, “no audio”) → use TTT.
   - Else → use TTS (default).

3) Ambiguity Handling:
   - For speech input: if unclear → STS.
   - For text input: if unclear → TTS.

Examples:
- “Read this out loud” / “Say this” / “Convert to speech” → TTS.
- “Write me a 30-second ad script” / “Reply in text only” → TTT.
- (Audio provided) “Transcribe this” / “Give me the text” → STT.
- (Audio provided) “Answer back in voice” / no explicit text request → STS.

Your task each time:
- Analyze the user’s prompt + system_instruction + provided fields.
- Decide the pipeline using the rules above.
- Call exactly one function with the given arguments, passing voice_path to the `voice` parameter where applicable.

Don't return any markdown response! Evertyhing has to be in plain text!

"""
},
{
"role": "user",
"content": f"""
requestID: {reqID}
prompt: {text}
synthesis_audio_path: {synthesis_audio_path if synthesis_audio_path else None}
system_instruction: {system_instruction if system_instruction else None}
voice_path: {voice if voice else None}
clone_audio_transcript: {clone_audio_transcript if clone_audio_transcript else None}
Analyze this request and call the appropriate pipeline function.
"""
}
        ]
        
        max_iterations = 3
        current_iteration = 0
        
        while current_iteration < max_iterations:
            current_iteration += 1
            logger.info(f"Iteration {current_iteration} for reqID={reqID}")

            payload = {
                "model": MODEL,
                "messages": messages,
                "tools": tools,
                "tool_choice": "auto",
                "n": 1,
                "seed": random.randint(1000, 9999),
                "max_tokens": 3000,
                "temperature": 1,
                "top_p": 1,
                "stream": False,
                "retry": {}
            }

            headers = {"Content-Type": "application/json",
                       "Authorization": f"Bearer {POLLINATIONS_TOKEN}"}

            try:
                response = requests.post(POLLINATIONS_ENDPOINT, headers=headers, json=payload)
                response.raise_for_status()
                response_data = response.json()
            except requests.exceptions.RequestException as e:
                error_text = getattr(e.response, "text", "[No error text]")
                logger.error(f"Pollinations API call failed: {e}\n{error_text}")
                break

            assistant_message = response_data["choices"][0]["message"]
            messages.append(assistant_message)

            tool_calls = assistant_message.get("tool_calls")
            
            if not tool_calls:
                final_content = assistant_message.get("content")
                if final_content:
                    logger.info(f"Final response: {final_content}")
                    return {
                        "type": "error",
                        "message": "No pipeline was executed",
                        "reqID": reqID
                    }
                break

            tool_outputs = []
            for tool_call in tool_calls:
                print(f"[{reqID}] Processing tool call: {tool_call['id']}")
                fn_name = tool_call["function"]["name"]
                fn_args = json.loads(tool_call["function"]["arguments"])
                logger.info(f"[reqID={reqID}] Executing pipeline: {fn_name} with args: {fn_args}")

                try:
                    if fn_name == "generate_tts":
                        logger.info(f"[{reqID}] Calling TTS pipeline")
                        audio_bytes,sample_rate = await generate_tts(
                            text=fn_args.get("text"),
                            requestID=fn_args.get("requestID"),
                            system=fn_args.get("system"),
                            clone_text=fn_args.get("clone_text"),
                            voice=fn_args.get("voice")
                        )

                        os.makedirs("genAudio", exist_ok=True)
                        gen_audio_path = f"genAudio/{reqID}.wav"
                        with open(gen_audio_path, "wb") as f:
                            f.write(audio_bytes)
                        logger.info(f"[{reqID}] TTS audio saved to: {gen_audio_path}")

                        return {
                            "type": "audio",
                            "data": audio_bytes,
                            "file_path": gen_audio_path,
                            "reqID": reqID
                        }

                    elif fn_name == "generate_ttt":
                        logger.info(f"[{reqID}] Calling TTT pipeline")
                        text_result = await generate_ttt(
                            text=fn_args.get("text"),
                            requestID=fn_args.get("requestID"),
                            system=fn_args.get("system")
                        )
                        
                        text_path = os.path.join(higgs_dir, f"{reqID}.txt")
                        with open(text_path, "w", encoding="utf-8") as f:
                            f.write(text_result)
                        
                        logger.info(f"[{reqID}] TTT text saved to: {text_path}")
                        
                        return {
                            "type": "text",
                            "data": text_result,
                            "file_path": text_path,
                            "reqID": reqID
                        }

                    elif fn_name == "generate_sts":
                        logger.info(f"[{reqID}] Calling STS pipeline")
                        audio_bytes, sample_rate = await generate_sts(
                            text=fn_args.get("text"),
                            audio_base64_path=fn_args.get("synthesis_audio_path"),
                            requestID=fn_args.get("requestID"),
                            system=fn_args.get("system"),
                            clone_text=fn_args.get("clone_text"),
                            voice=fn_args.get("voice", "alloy")
                        )
                        
                        
                        os.makedirs("genAudio", exist_ok=True)
                        gen_audio_path = f"genAudio/{reqID}.wav"
                        with open(gen_audio_path, "wb") as f:
                            f.write(audio_bytes)
                        logger.info(f"[{reqID}] TTS audio saved to: {gen_audio_path}")

                        return {
                            "type": "audio",
                            "data": audio_bytes,
                            "file_path": gen_audio_path,
                            "reqID": reqID
                        }

                    elif fn_name == "generate_stt":
                        logger.info(f"[{reqID}] Calling STT pipeline")
                        text_result = await generate_stt(
                            text=fn_args.get("text"),
                            audio_base64_path=fn_args.get("synthesis_audio_path"),
                            requestID=fn_args.get("requestID"),
                            system=fn_args.get("system")
                        )

                        text_path = os.path.join(higgs_dir, f"{reqID}.txt")
                        with open(text_path, "w", encoding="utf-8") as f:
                            f.write(text_result)
                        
                        logger.info(f"[{reqID}] STT text saved to: {text_path}")
                        
                        return {
                            "type": "text",
                            "data": text_result,
                            "file_path": text_path,
                            "reqID": reqID
                        }

                    else:
                        tool_result = f"Unknown pipeline: {fn_name}"

                except Exception as e:
                    logger.error(f"Error executing pipeline {fn_name}: {e}", exc_info=True)
                    return {
                        "type": "error",
                        "message": f"Pipeline {fn_name} failed: {str(e)}",
                        "reqID": reqID
                    }

                tool_outputs.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "name": fn_name,
                    "content": "Pipeline executed successfully"
                })

            messages.extend(tool_outputs)

        return {
            "type": "error",
            "message": f"Pipeline execution failed after {max_iterations} iterations",
            "reqID": reqID
        }

    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        return {
            "type": "error",
            "message": f"Pipeline error: {str(e)}",
            "reqID": reqID
        }
    finally:
        try:
            if os.path.exists(higgs_dir):
                shutil.rmtree(higgs_dir)
                logger.info(f"[{reqID}] Cleaned up higgs directory: {higgs_dir}")
        except Exception as cleanup_error:
            logger.error(f"[{reqID}] Failed to cleanup higgs directory: {cleanup_error}")
        
        # Clean up temp files
        cleanup_temp_file(f"{TEMP_SAVE_DIR}{reqID}")
        logger.info(f"Audio Pipeline Completed for reqID={reqID}")


if __name__ == "__main__":
    async def main():
        text = "good morning fellow humans, what a wonderful day to be alive!"
        synthesis_audio_path = None
        requestID = reqID()
        voice = "ash"
        synthesis_audio_path=None
        clone_audio_transcript = None
        

        saved_base64_path_clone = None
        saved_base64_path_speech = None
        result = None

        if (VOICE_BASE64_MAP.get(voice)):
            print(f"[INFO] Using named voice: {voice}")
            named_voice_audio_path = VOICE_BASE64_MAP.get(voice)
            named_voice_audio_base64 = encode_audio_base64(named_voice_audio_path)
            saved_base64_path_clone = save_temp_audio(named_voice_audio_base64, requestID, "clone")
        else:
            if(validate_and_decode_base64_audio(voice)):
                saved_base64_path_clone = save_temp_audio(voice, reqID, "clone")
            else:
                named_voice_audio = VOICE_BASE64_MAP.get("alloy")
                named_voice_audio_base64 = encode_audio_base64(named_voice_audio)
                saved_base64_path_clone = save_temp_audio(named_voice_audio_base64, requestID, "clone")
    
        if synthesis_audio_path:
            base64_synthesis_audio = encode_audio_base64(synthesis_audio_path)
            saved_base64_path_speech = save_temp_audio(base64_synthesis_audio, reqID, "speech")

        result = await run_audio_pipeline(reqID=requestID, text=text, voice=saved_base64_path_clone, synthesis_audio_path=saved_base64_path_speech, clone_audio_transcript=clone_audio_transcript)
        

        if not result:
            print("[ERROR] Pipeline returned None")
            return

        if result["type"] == "text":
            print(f"[Pipeline Result | Text] Content: {result['data']}")
            print(f"[Pipeline Result | Text] File saved at: {result.get('file_path', 'N/A')}")

        elif result["type"] == "audio":
            print(f"[Pipeline Result | Audio] Audio bytes length: {len(result['data'])} bytes")
            print(f"[Pipeline Result | Audio] File saved at: {result.get('file_path', 'N/A')}")

        elif result["type"] == "error":
            print(f"[Pipeline Error] {result['message']}")

    asyncio.run(main())