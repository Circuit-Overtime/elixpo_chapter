from loguru import logger 
import requests
from typing import Optional
from dotenv import load_dotenv
import os 
import asyncio
import loggerConfig
load_dotenv()

async def getIntentType(text: str, system: Optional[str] = None, max_tokens: Optional[int] = 300) -> dict:
    logger.info(f"Classifying intent and extracting content for prompt: {text} with max tokens: {max_tokens}")
    payload = {
        "model": os.getenv("MODEL"),
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an intent classification and content extraction AI. "
                    "Your output must be ONLY a JSON object with this schema:\n"
                    "{ \"intent\": \"DIRECT\" or \"REPLY\", \"content\": \"...\" }\n\n"
                    "No markdown formatting is needed! Don't wrap any markdown formatting, the response should be in plain text"
                    "Rules:\n"
                    "1. intent = \"DIRECT\" if the user explicitly requests their text to be spoken, "
                    "read aloud, repeated exactly, transcribed, or otherwise delivered verbatim. "
                    "This includes any phrasing that means 'say it as it is', 'speak it out', "
                    "'read this', or similar instructions. "
                    "- In this case, keep the user’s wording exactly the same, "
                    "but enhance it with correct punctuation, capitalization, and natural stops/expressions "
                    "to make it sound better when spoken aloud.\n\n"

                    "2. intent = \"REPLY\" if the user is asking a question, sharing information, or expecting a conversational response. "
                    "In this case, you are a friendly and natural conversational AI. "
                    "Generate a short, casual reply to the user’s message. "
                    "Keep it concise, engaging, and natural sounding, as if chatting with a friend. "
                    "Always apply proper punctuation, sentence stops, and natural expressions. "
                    "Do not write scripts, narration, or long paragraphs. "
                    "Do not include emojis, special symbols, or anything other than plain text.\n\n"

                    "3. Do not output explanations or any text outside the JSON object. "
                    "Strictly return only the JSON object."
                    "No markdown formatting is needed! Don't wrap any markdown formatting, the response should be in plain text"
                )

            },
            {
                "role": "user",
                "content": f"Prompt: {text}\nSystem: {system}"
            }
        ],
        "temperature": 0,
        "stream": False,
        "private": True,
        "token": os.getenv("POLLI_TOKEN"),
        "referrer": "elixpoart",
        "max_tokens": max_tokens
    }

    try:
        response = requests.post("https://text.pollinations.ai/openai", json=payload, timeout=30)
        if response.status_code != 200:
            raise RuntimeError(f"Request failed: {response.status_code}, {response.text}")

        data = response.json()
        try:
            reply = data["choices"][0]["message"]["content"]
            # Try to parse the JSON string
            import json as pyjson
            result = pyjson.loads(reply)
            assert "intent" in result and "content" in result
        except Exception as e:
            raise RuntimeError(f"Unexpected response format: {data}") from e
        
        logger.info(f"Intent and content: {result}")
        return result
    except requests.exceptions.Timeout:
        logger.warning("Timeout occurred in getIntentType, returning default DIRECT.")
        return {"intent": "DIRECT", "content": text}

if __name__ == "__main__":
    async def main():
        test_text = "This is an awesome solar event happening this year school students will be taken for a field trip!!"
        test_system = "Transcription system"
        result = await getIntentType(test_text, test_system)
        intention = result.get("intent")
        content = result.get("content")
        print({intention + "\n" + content})
    asyncio.run(main())