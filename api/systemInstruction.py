import requests
from dotenv import load_dotenv
import os
from loguru import logger
import asyncio
import random
load_dotenv()

async def generate_higgs_system_instruction(text: str) -> str:
    logger.info(f"Generating Higgs system instruction for text: {text}")
    
    base_instruction = """
You are a system instruction generator for a speech synthesis model called Higgs.
Analyze the user's text and create a scene description that sets the vocal environment, tone, and speaking style.

Your job is to describe HOW the text should be spoken, not WHAT should be said.

Focus on:
- Voice texture and tone (warm, crisp, breathy, rich, smooth, raspy, etc.)
- Emotional atmosphere (intimate, energetic, contemplative, dramatic, playful, etc.)  
- Speaking pace and rhythm (leisurely, urgent, measured, flowing, staccato, etc.)
- Physical environment feel (cozy room, grand hall, quiet library, bustling cafe, etc.)
- Vocal character (confident speaker, gentle storyteller, excited friend, wise mentor, etc.)
- Natural human qualities (slight breathiness, warm chuckles, thoughtful pauses, etc.)

Do NOT include any dialogue or text content - only describe the speaking environment and vocal approach.
Use plain descriptive language without any formatting.

Response format (exactly like this):
(
"You are a masterful voice performer bringing text to life with authentic human artistry."
"Channel the energy of a skilled actor - make every word breathe with genuine emotion and personality."
"Use natural vocal textures, micro-pauses, emotional inflections, and dynamic pacing to create a captivating performance."
"Avoid robotic delivery - embrace the beautiful imperfections and nuances of human speech."
"Generate audio following instruction."
"<|scene_desc_start|>"
[SCENE DESCRIPTION HERE - describe voice texture, tone, environment, and speaking style only]
"<|scene_desc_end|>"
)
""" 

    header = {
        "Content-Type": "application/json",
        "Authorization" : f"Bearer {os.getenv('POLLI_TOKEN')}"
    }

    payload = {
        "model": "mistral",
        "messages": [
            {"role": "system", "content": base_instruction},
            {"role": "user", "content": f"Text to analyze for vocal style: {text}"}
        ],
        "temperature": 0.7,
        "stream": False,
        "private": True,
        "referrer": "elixpoart",
        "max_tokens": 200,
        "seed": random.randint(1000, 1000000)
    }
    
    try:
        response = requests.post("https://enter.pollinations.ai/api/generate/v1/chat/completions", headers=header, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()

        try:
            system_instruction: str = data["choices"][0]["message"]["content"]
            # Strip any unwanted sponsor content
            if "---" in system_instruction and "**Sponsor**" in system_instruction:
                sponsor_start = system_instruction.find("---")
                system_instruction = system_instruction[:sponsor_start].strip()
        except Exception as e:
            raise RuntimeError(f"Unexpected response format: {data}") from e

        return system_instruction.strip()

    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {e}")
        return await _get_fallback_instruction(text)
    except requests.exceptions.Timeout:
        logger.warning("Request timed out, using fallback")
        return await _get_fallback_instruction(text)

async def _get_fallback_instruction(text: str) -> str:
    text_lower = text.lower()
    
    if any(word in text_lower for word in ["exciting", "amazing", "wow", "awesome", "incredible"]):
        scene = "Speak with vibrant enthusiasm and bright energy. Voice should sparkle with genuine excitement, using animated tones and lively pacing. Create an atmosphere of joy and wonder, as if sharing thrilling news with a close friend."
    elif any(word in text_lower for word in ["calm", "peaceful", "gentle", "soft", "quiet"]):
        scene = "Use a soft, soothing voice with gentle warmth. Speak with measured, peaceful pacing in an intimate, comforting atmosphere. Voice should feel like a warm embrace, creating a sense of tranquility and safety."
    elif any(word in text_lower for word in ["serious", "important", "urgent", "critical"]):
        scene = "Adopt a clear, authoritative tone with focused intensity. Speak with measured gravity and purposeful pacing. Create an atmosphere of importance and attention, like addressing a meaningful gathering."
    elif any(word in text_lower for word in ["funny", "joke", "laugh", "humor", "silly"]):
        scene = "Use a playful, warm voice with natural chuckles and light-hearted energy. Speak with bouncy rhythm and mischievous undertones. Create a jovial atmosphere filled with warmth and good humor."
    else:
        scene = "Speak with natural conversational warmth and genuine human connection. Use a balanced, expressive voice with organic pacing and authentic emotional undertones. Create a comfortable, engaging atmosphere like chatting with a trusted friend."
    
    return f"""
(
"You are a masterful voice performer bringing text to life with authentic human artistry."
"Channel the energy of a skilled actor - make every word breathe with genuine emotion and personality."
"Use natural vocal textures, micro-pauses, emotional inflections, and dynamic pacing to create a captivating performance."
"Avoid robotic delivery - embrace the beautiful imperfections and nuances of human speech."
"Generate audio following instruction."
"<|scene_desc_start|>"
{scene}
"<|scene_desc_end|>"
)
    """

if __name__ == "__main__":
    async def main():
        user_prompt = "Hello everyone! I'm so excited to share this amazing news with you today!"

        system_instruction = await generate_higgs_system_instruction(user_prompt)
        print("\n--- Generated Higgs System Instruction ---\n")
        print(system_instruction)
    asyncio.run(main())