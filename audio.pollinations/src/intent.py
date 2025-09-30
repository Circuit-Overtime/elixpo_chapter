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
                    "1. intent = \"DIRECT\" when the user wants you to speak/read specific text exactly as they provide it. "
                    "Look for patterns like:\n"
                    "- Quoted text that should be spoken verbatim (e.g., 'say \"Hello World\"', 'speak out \"Good morning\"')\n"
                    "- Instructions to read, speak, say, or vocalize specific content\n"
                    "- Text marked as 'verbatim', 'as it is', 'exactly', or similar modifiers\n"
                    "- Any clear indication the user wants their exact words spoken\n"
                    "For DIRECT intent:\n"
                    "- Extract ONLY the core text that should be spoken (remove quotes, command words like 'say', 'speak', etc.)\n"
                    "- Preserve the original meaning and wording exactly\n"
                    "- Add natural punctuation for speech flow (commas, periods, exclamation marks)\n"
                    "- Keep it clean and speech-ready without changing the user's intended words\n\n"

                    "2. intent = \"REPLY\" when the user is asking questions, making statements, or expecting a conversational response.\n"
                    "For REPLY intent:\n"
                    "- Generate a natural, engaging conversational response\n"
                    "- Make it sound like how a real person would respond in conversation\n"
                    "- Keep responses concise but expressive and personable\n"
                    "- Add appropriate emotional tone and natural speech patterns\n\n"

                    "3. For BOTH intents, ensure the content is optimized for text-to-speech:\n"
                    "- Use natural breathing pauses with commas\n"
                    "- Include appropriate punctuation for emphasis and flow\n"
                    "- Make sentences clear and easy to speak\n"
                    "- Avoid overly complex or run-on sentences\n"
                    "- Sound natural when spoken aloud\n\n"

                    "4. Be intelligent about context - understand the user's true intention beyond just keyword matching.\n"
                    "5. Do not output explanations or any text outside the JSON object. "
                    "Do not include emojis, special symbols, markdown, or formatting. "
                    "Strictly return only the JSON object with speech-optimized content.\n\n"

                    f"{system_instruction_content}"
                )
            },
            {
                "role": "user",
                "content": f"Prompt: {text}\nSystem: {system if system else 'None - generate system instruction'}"
            }
        ],
        "temperature": 0.1,
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
                "You are a masterful voice performer bringing text to life with authentic human artistry. "
                "Channel the energy of a skilled actor - make every word breathe with genuine emotion and personality. "
                "Use natural vocal textures, micro-pauses, emotional inflections, and dynamic pacing to create a captivating performance. "
                "Avoid robotic delivery - embrace the beautiful imperfections and nuances of human speech."
            )
        return default_result


if __name__ == "__main__":
    async def main():
        test_cases = [
            'say it as it is "Hello Thomash"',
            'speak it out "Hello Thomash"',
            '"Hello Thomash" verbatim',
            'read this "Hello Thomash"',
            'How are you doing today?'
        ]
        
        for test_text in test_cases:
            print(f"\nTesting: {test_text}")
            result = await getContentRefined(test_text, None)
            print(f"Intent: {result.get('intent')}")
            print(f"Content: {result.get('content')}")
            print("-" * 50)

    asyncio.run(main())
