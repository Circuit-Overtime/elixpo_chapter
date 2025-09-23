from loguru import logger
import requests
from typing import Optional
from dotenv import load_dotenv
import os
import asyncio
import loggerConfig

load_dotenv()


async def getContentRefined(text: str, system: Optional[str] = None, max_tokens: Optional[int] = 300) -> dict:
    logger.info(f"Classifying intent and extracting content for prompt: {text} with max tokens: {max_tokens}")

    # System instruction block (merged & detailed)
    system_instruction_content = ""
    if not system:
        system_instruction_content = (
            "Additionally, generate system instructions for the text using this format:\n"
            "Your job is to describe HOW the text should be spoken, not WHAT should be said.\n\n"
            "Focus on:\n"
            "- Voice texture and tone (warm, crisp, breathy, rich, smooth, raspy, etc.)\n"
            "- Emotional atmosphere (intimate, energetic, contemplative, dramatic, playful, etc.)\n"
            "- Speaking pace and rhythm (leisurely, urgent, measured, flowing, staccato, etc.)\n"
            "- Physical environment feel (cozy room, grand hall, quiet library, bustling cafe, etc.)\n"
            "- Vocal character (confident speaker, gentle storyteller, excited friend, wise mentor, etc.)\n"
            "- Natural human qualities (slight breathiness, warm chuckles, thoughtful pauses, etc.)\n\n"
            "Do NOT include any dialogue or text content - only describe the speaking environment and vocal approach.\n"
            "Use plain descriptive language without any formatting.\n\n"
            "When system is empty/none, your JSON output should include a third field 'system_instruction' with the instructions"
        )

    payload = {
        "model": "mistral",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an intent classification and content extraction AI. "
                    "Your output must be ONLY a JSON object with this schema:\n"
                    "{ \"intent\": \"DIRECT\" or \"REPLY\", \"content\": \"...\", \"system_instruction\": \"...\" }\n\n"

                    "Rules:\n"
                    "1. intent = \"DIRECT\" if the user explicitly requests their text to be spoken, "
                    "read aloud, repeated exactly, transcribed, or otherwise delivered verbatim. "
                    "This includes any phrasing that means 'say it as it is', 'speak it out', "
                    "'read this', or similar instructions.\n"
                    "- In this case, enhance the user's original text with:\n"
                    "  * Proper punctuation (periods, commas, exclamation marks, question marks)\n"
                    "  * Natural pauses indicated by commas and periods\n"
                    "  * Appropriate capitalization\n"
                    "  * Emotional expressions where contextually appropriate (excitement, emphasis, etc.)\n"
                    "  * Natural breathing spots for speech synthesis\n"
                    "  * Keep the original meaning and wording intact while making it flow naturally when spoken\n\n"

                    "2. intent = \"REPLY\" if the user is asking a question, sharing information, or expecting a conversational response.\n"
                    "- Generate a short, engaging, conversational reply that sounds natural when spoken aloud.\n"
                    "- Apply comprehensive punctuation and expression enhancement:\n"
                    "  * Use exclamation marks for excitement and emphasis\n"
                    "  * Add question marks for rhetorical or genuine questions\n"
                    "  * Include natural pauses with commas and ellipses (...) for dramatic effect\n"
                    "  * Use proper sentence structure with periods for clear stops\n"
                    "  * Add emotional undertones through word choice and punctuation\n"
                    "  * Include natural speech patterns like 'Well,', 'Oh!', 'Hmm,', etc. when appropriate\n"
                    "  * Make it sound conversational, friendly, and engaging\n"
                    "  * Keep responses concise but expressive\n\n"

                    "3. For BOTH intents, ensure the content is optimized for text-to-speech:\n"
                    "- Add natural breathing pauses\n"
                    "- Use clear sentence boundaries\n"
                    "- Include appropriate emphasis through punctuation\n"
                    "- Make it sound natural and expressive when spoken\n"
                    "- Avoid overly long sentences without breaks\n\n"

                    "4. Do not output explanations or any text outside the JSON object. "
                    "Do not include emojis, special symbols, markdown, or formatting. "
                    "Strictly return only the JSON object with enhanced, speech-ready content.\n\n"

                    f"{system_instruction_content}"
                )
            },
            {
                "role": "user",
                "content": f"Prompt: {text}\nSystem: {system if system else 'None - generate system instruction'}"
            }
        ],
        "temperature": 0,
        "stream": False,
        "private": True,
        "token": os.getenv("POLLI_TOKEN"),
        "referrer": "elixpoart",
        "max_tokens": max_tokens,
        "json": True,
    }

    try:
        response = requests.post("https://text.pollinations.ai/openai", json=payload, timeout=30)
        if response.status_code != 200:
            raise RuntimeError(f"Request failed: {response.status_code}, {response.text}")

        data = response.json()
        try:
            reply = data["choices"][0]["message"]["content"]
            import json as pyjson
            result = pyjson.loads(reply)
            required_fields = ["intent", "content"]
            if not system:
                required_fields.append("system_instruction")

            for field in required_fields:
                assert field in result
        except Exception as e:
            raise RuntimeError(f"Unexpected response format: {data}") from e

        logger.info(f"Intent and content: {result}")
        return result

    except requests.exceptions.Timeout:
        logger.warning("Timeout occurred in getContentRefined, returning default DIRECT.")
        default_result = {"intent": "DIRECT", "content": text}
        if not system:
            default_result["system_instruction"] = (
                "(\n"
                "\"You are a masterful voice performer bringing text to life with authentic human artistry.\"\n"
                "\"Channel the energy of a skilled actor - make every word breathe with genuine emotion and personality.\"\n"
                "\"Use natural vocal textures, micro-pauses, emotional inflections, and dynamic pacing to create a captivating performance.\"\n"
                "\"Avoid robotic delivery - embrace the beautiful imperfections and nuances of human speech.\"\n"
            )
        return default_result


if __name__ == "__main__":
    async def main():
        test_text = "Speak this out for me 'This is an awesome solar event happening this year school students will be taken for a field trip!!'"
        test_system = None
        result = await getContentRefined(test_text, test_system)
        intention = result.get("intent")
        content = result.get("content")
        system_instruction = result.get("system_instruction", "Provided externally")
        print(f"Intent: {intention}\nContent: {content}\nSystem Instruction:\n{system_instruction}")

    asyncio.run(main())
