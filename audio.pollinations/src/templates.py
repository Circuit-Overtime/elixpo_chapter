import json
from typing import Optional
import os
from boson_multimodal.data_types import ChatMLSample, Message, AudioContent
from boson_multimodal.serve.serve_engine import HiggsAudioServeEngine
from loguru import logger
from utility import normalize_text
import sys
from config import TEMP_SAVE_DIR


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
higgs_engine: Optional[HiggsAudioServeEngine] = None

def create_speaker_chat(
    text: str,
    requestID: str,
    system: Optional[str] = None,
    clone_audio_path: Optional[str] = None,
    clone_audio_transcript: Optional[str] = None
) -> ChatMLSample:
    logger.info(f"Creating chat template for request {requestID} with text: {text}")
    messages = []
    if system:
        if "<|scene_desc_start|>" not in system or "<|scene_desc_end|>" not in system:
            systemPromptWrapper: str = f"""
                (
                Generate audio following instruction.\n
                <|scene_desc_start|>\n
                "{system}"
                <|scene_desc_end|>
                )
            """
        else:
            systemPromptWrapper: str = system

        
        messages.append(
            Message(
                role="system",
                content=systemPromptWrapper,
            )
        )


    if clone_audio_path:
        with open(clone_audio_path, "r") as f:
            reference_audio_data = f.read()
        
        if clone_audio_transcript:
            messages.append(
                Message(
                    role="user",
                    content=normalize_text(clone_audio_transcript),
                )
            )
        else:
            messages.append(
                Message(
                    role="user",
                    content="Please clone this voice.",
                )
            )
        
        messages.append(
            Message(
                role="assistant",  
                content=[AudioContent(raw_audio=reference_audio_data, audio_url="")],
            )
        )

    messages.append(
        Message(
            role="user",
            content=text
        )
    )

    # logger.info(f"Created chat template with {len(messages)} messages for request {requestID}")
    # os.makedirs(f"{TEMP_SAVE_DIR}{requestID}", exist_ok=True)
    
    # def serialize_message(msg: Message):
    #     # Handles both string and list-of-AudioContent for content
    #     if isinstance(msg.content, str):
    #         content = msg.content
    #     elif isinstance(msg.content, list):
    #         # Ensure all items are dicts (for AudioContent or future types)
    #         content = [c.__dict__ if hasattr(c, "__dict__") else c for c in msg.content]
    #     else:
    #         # Fallback for unexpected types
    #         content = str(msg.content)
    #     return {
    #         "role": msg.role,
    #         "content": content
    #     }

    # serialized_messages = [serialize_message(m) for m in messages]

    # chat_template_path = f"{TEMP_SAVE_DIR}{requestID}/chatTemplate.json"
    # with open(chat_template_path, "w", encoding="utf-8") as f:
    #     json.dump(serialized_messages, f, ensure_ascii=False, indent=2)

    return ChatMLSample(messages=messages)


if __name__ == "__main__":
    template = create_speaker_chat(
        "Woohooo!! This is super awesomeeeee!!!",
        "request12",
        "An energetic ambience! Don't add any overhead sounds or tokens, just say as much",
    )
    # print(template)
    print(f"Chat template saved to {template}")