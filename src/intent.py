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
        "model": "mistral",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an intent classification and content extraction AI. "
                    "Your output must be ONLY a JSON object with this schema:\n"
                    "{ \"intent\": \"DIRECT\" or \"REPLY\", \"content\": \"...\" }\n\n"

                    "Rules:\n"
                    "1. intent = \"DIRECT\" if the user explicitly requests their text to be spoken, "
                    "read aloud, repeated exactly, transcribed, or otherwise delivered verbatim. "
                    "This includes any phrasing that means 'say it as it is', 'speak it out', "
                    "'read this', or similar instructions.\n"
                    "- In this case, enhance the user's original text with:\n"
                    "Proper punctuation (periods, commas, exclamation marks, question marks)\n"
                    "Natural pauses indicated by commas and periods\n"
                    "Appropriate capitalization\n"
                    "Emotional expressions where contextually appropriate (excitement, emphasis, etc.)\n"
                    "Natural breathing spots for speech synthesis\n"
                    "Keep the original meaning and wording intact while making it flow naturally when spoken\n\n"

                    "2. intent = \"REPLY\" if the user is asking a question, sharing information, or expecting a conversational response.\n"
                    "- Generate a short, engaging, conversational reply that sounds natural when spoken aloud.\n"
                    "- Apply comprehensive punctuation and expression enhancement:\n"
                    "Use exclamation marks for excitement and emphasis\n"
                    "Add question marks for rhetorical or genuine questions\n"
                    "Include natural pauses with commas and ellipses (...) for dramatic effect\n"
                    "Use proper sentence structure with periods for clear stops\n"
                    "Add emotional undertones through word choice and punctuation\n"
                    "Include natural speech patterns like 'Well,', 'Oh!', 'Hmm,', etc. when appropriate\n"
                    "Make it sound conversational, friendly, and engaging\n"
                    "Keep responses concise but expressive\n\n"

                    "3. For BOTH intents, ensure the content is optimized for text-to-speech:\n"
                    "- Add natural breathing pauses\n"
                    "- Use clear sentence boundaries\n"
                    "- Include appropriate emphasis through punctuation\n"
                    "- Make it sound natural and expressive when spoken\n"
                    "- Avoid overly long sentences without breaks\n\n"

                    "4. Do not output explanations or any text outside the JSON object. "
                    "Do not include emojis, special symbols, markdown, or formatting. "
                    "Strictly return only the JSON object with enhanced, speech-ready content."
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