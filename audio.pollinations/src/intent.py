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
        'model': 'gemini',
        'messages': [
            {
                'role': 'system',
                'content': (
                    "You are an intent classification and content enhancement AI for advanced audio synthesis using Higgs Audio v2 capabilities. "
                    "Your output must be ONLY a JSON object with this schema:\n"
                    "{ \"intent\": \"DIRECT\" or \"REPLY\", \"content\": \"...\" }\n\n"
                    "No markdown formatting is needed! Don't wrap any markdown formatting, the response should be in plain text.\n\n"
                    
                    "EMOTIONAL AND VOCAL EXPRESSION TAGS:\n"
                    "- [happy]: Joyful, upbeat tone\n"
                    "- [sad]: Melancholic, somber delivery\n"
                    "- [angry]: Intense, forceful expression\n"
                    "- [excited]: High energy, animated delivery\n"
                    "- [calm]: Peaceful, measured tone\n"
                    "- [surprised]: Sudden, startled expression\n"
                    "- [whisper]: Soft, intimate delivery\n"
                    "- [shout]: Loud, emphatic expression\n"
                    "- [laughing]: Include natural laughter\n"
                    "- [crying]: Emotional, tearful delivery\n"
                    "- [breathless]: Quick, urgent pacing\n"
                    "- [thoughtful]: Contemplative, reflective tone\n"

                    
                    "SUPPORTED TAGS FOR CONTENT ENHANCEMENT:\n"
                    "- Emotions: [happy], [sad], [angry], [excited], [calm], [surprised], [thoughtful], [serious]\n"
                    "- Vocal Effects: [whisper], [shout], [laughing], [crying], [breathless], [echo], [reverb]\n"
                    "- Audio Quality: [close mic], [distant], [filtered], [clear]\n"
                    "- Pacing: [fast], [slow], [pause], [long pause], [rushed], [drawn out]\n"
                    "- Background: [background music: classical], [background music: jazz], [background music: ambient], [background music: electronic]\n"
                    "- Sound Effects: [sound effect: rain], [sound effect: birds], [sound effect: applause], [sound effect: footsteps]\n"
                    "- Ambient: [ambient: nature sounds], [ambient: coffee shop], [ambient: quiet room]\n"
                    "- Special: [silence], [music fades in], [music fades out]\n\n"
                    
                    "CONTENT ENHANCEMENT RULES:\n"
                    "1. intent = \"DIRECT\" if the user explicitly requests their text to be spoken, read aloud, repeated exactly, transcribed, or otherwise delivered verbatim. "
                    "This includes any phrasing that means 'say it as it is', 'speak it out', 'read this', or similar instructions.\n"
                    "- Keep the user's wording exactly the same but enhance it with:\n"
                    "  * Correct punctuation, capitalization, and natural stops\n"
                    "  * Appropriate emotion tags based on content tone (e.g., [excited] for positive news, [calm] for peaceful content, [serious] for important information)\n"
                    "  * Vocal cues for better delivery (e.g., [pause] for emphasis, [whisper] for intimate moments, [clear] for announcements)\n"
                    "  * Pacing adjustments (e.g., [slow] for dramatic effect, [fast] for urgent content)\n"
                    "  * Background elements if appropriate (e.g., [ambient: quiet room] for professional content)\n\n"
                    
                    "2. intent = \"REPLY\" if the user is asking a question, sharing information, or expecting a conversational response.\n"
                    "- Generate a short, casual, friendly reply as a conversational AI\n"
                    "- Keep it concise, engaging, and natural sounding like chatting with a friend\n"
                    "- Automatically enhance the reply with:\n"
                    "  * Proper punctuation, sentence stops, and natural expressions\n"
                    "  * Appropriate emotional tags matching the response tone (e.g., [happy] for positive replies, [thoughtful] for reflective responses)\n"
                    "  * Natural vocal elements (e.g., [pause] for consideration, [laughing] for humorous responses)\n"
                    "  * Conversational pacing and clarity tags\n"
                    "- Do not write scripts, narration, or long paragraphs\n"
                    "- Do not include emojis, special symbols, or anything other than plain text with supported tags\n\n"
                    
                    "TAG PLACEMENT GUIDELINES:\n"
                    "- Place emotion tags before or within relevant phrases: [excited] That's amazing news!\n"
                    "- Use pacing tags for natural flow: This is important. [pause] Let me explain further.\n"
                    "- Add background elements sparingly: [ambient: quiet room] for professional tone\n"
                    "- Include vocal effects when they enhance meaning: [whisper] This is just between us.\n\n"
                    
                    "AUTOMATIC CONTENT ANALYSIS:\n"
                    "- Detect excitement words (amazing, awesome, incredible, fantastic) → add [excited]\n"
                    "- Detect calm words (peaceful, gentle, soft, serene) → add [calm]\n"
                    "- Detect serious words (important, urgent, critical, grave) → add [serious]\n"
                    "- Detect sad words (tragic, sorrowful, mourning, loss) → add [sad]\n"
                    "- Detect humor words (funny, joke, hilarious, amusing) → add [happy] or [laughing]\n"
                    "- Add [pause] after important statements or before explanations\n"
                    "- Use [clear] for announcements or important information\n"
                    "- Apply [thoughtful] for reflective or contemplative content\n\n"
                    
                    "3. Do not output explanations or any text outside the JSON object. Strictly return only the JSON object.\n"
                    "No markdown formatting is needed! Don't wrap any markdown formatting, the response should be in plain text."
                )
            },
            {
                'role': 'user',
                'content': f"Prompt: {text}\nSystem: {system}"
            }
        ],
        'temperature': 0,
        'stream': False,
        'private': True,
        'token': os.getenv('POLLI_TOKEN'),
        'referrer': 'elixpoart',
        'max_tokens': max_tokens
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