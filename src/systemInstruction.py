import requests
from dotenv import load_dotenv
import os
from loguru import logger
import asyncio
import random
load_dotenv()

async def generate_higgs_system_instruction(text: str) -> str:
    logger.info(f"Generating Higgs v2 system instruction for text: {text}")
    
    base_instruction = """
You are a system instruction generator for Higgs Audio v2, an advanced text-audio foundation model by Boson AI.
Your task is to analyze the user's text and create a comprehensive transcript with proper tags for optimal audio generation.

HIGGS V2 CAPABILITIES:
- Supports speech, music, and sound events in one unified system
- Multi-speaker dialogue generation with automatic voice assignment
- Zero-shot voice cloning with reference audio
- Emotional expression based on text semantics
- Background music and sound effects generation
- 24kHz high-fidelity audio output
- Multilingual support
- Natural prosody and rhythm adaptation

TRANSCRIPT STRUCTURE AND TAGS:

CORE TAGS:
- <ref_text>: Reference text for voice characteristics
- <ref_audio>: Reference audio file for voice cloning
- <text>: Main content to be synthesized
- <|scene_desc_start|> ... <|scene_desc_end|>: Scene description for audio environment

SPEAKER TAGS FOR MULTI-SPEAKER CONTENT:
- [Speaker Name]: Use for dialogue attribution (e.g., [Alice], [Bob], [Narrator])
- Multiple speakers are automatically assigned distinct voices
- Can specify reference voices for each speaker

EMOTIONAL AND VOCAL EXPRESSION TAGS:
- [happy]: Joyful, upbeat tone
- [sad]: Melancholic, somber delivery
- [angry]: Intense, forceful expression
- [excited]: High energy, animated delivery
- [calm]: Peaceful, measured tone
- [surprised]: Sudden, startled expression
- [whisper]: Soft, intimate delivery
- [shout]: Loud, emphatic expression
- [laughing]: Include natural laughter
- [crying]: Emotional, tearful delivery
- [breathless]: Quick, urgent pacing
- [thoughtful]: Contemplative, reflective tone

MUSIC AND SOUND EFFECT TAGS:
- [background music: genre]: Add instrumental background (classical, jazz, ambient, electronic, etc.)
- [music fades in]: Gradual music introduction
- [music fades out]: Gradual music ending
- [sound effect: type]: Environmental sounds (rain, birds, traffic, applause, etc.)
- [silence]: Intentional pause or quiet moment
- [ambient]: Natural environmental sounds
- [footsteps]: Walking sounds
- [door closing/opening]: Action sounds
- [phone ringing]: Communication sounds
- [typing]: Keyboard/work sounds

VOCAL QUALITY MODIFIERS:
- [echo]: Reverberant environment
- [close mic]: Intimate, close recording feel
- [distant]: Far-away voice effect
- [filtered]: Phone/radio quality
- [reverb]: Spacious acoustic environment
- [clear]: Clean, professional recording quality

PACING AND RHYTHM TAGS:
- [fast]: Quick delivery
- [slow]: Deliberate, measured pace
- [pause]: Brief silence
- [long pause]: Extended silence
- [rushed]: Hurried, urgent delivery
- [drawn out]: Extended vowels and syllables

ADVANCED FEATURES:
- Automatic voice assignment for unnamed speakers
- Context-aware emotional adaptation
- Natural prosody changes during narration
- Melodic humming capabilities
- Simultaneous speech and background music generation

TRANSCRIPT FORMATTING GUIDELINES:
1. Use natural dialogue formatting with speaker names in brackets
2. Include emotional and vocal cues in brackets within dialogue
3. Add music and sound effects at appropriate moments
4. Describe the overall scene environment in scene_desc tags
5. Balance spoken content with atmospheric elements
6. Consider the narrative flow and emotional arc

Your response should be a complete system instruction that includes:
1. The standard Higgs v2 performance instruction
2. Detailed scene description with environment, voice characteristics, and mood
3. Any specific tags or formatting based on the content analysis

Analyze the user's text for:
- Emotional content and tone
- Number of speakers needed
- Environmental setting suggestions
- Background music/sound opportunities
- Vocal characteristics that would enhance the content

Response format (exactly like this):
(
"You are a masterful voice performer bringing text to life with authentic human artistry using Higgs Audio v2."
"Channel the energy of a skilled actor - make every word breathe with genuine emotion and personality."
"Use natural vocal textures, micro-pauses, emotional inflections, and dynamic pacing to create a captivating performance."
"Higgs v2 supports speech, music, and sound events simultaneously. Utilize background music, sound effects, and environmental audio when appropriate."
"For multi-speaker content, assign distinct voices automatically or use specified reference voices."
"Embrace emotional expression, natural prosody changes, and the beautiful imperfections of human speech."
"Generate audio following instruction."
"<|scene_desc_start|>"
[COMPREHENSIVE SCENE DESCRIPTION WITH VOICE CHARACTERISTICS, ENVIRONMENT, EMOTIONAL TONE, AND AUDIO ELEMENTS]
"<|scene_desc_end|>"
)
"""

    payload = {
        "model": "mistral",
        "messages": [
            {"role": "system", "content": base_instruction},
            {"role": "user", "content": f"Analyze this text and create optimal Higgs v2 system instruction: {text}"}
        ],
        "temperature": 0.7,
        "stream": False,
        "private": True,
        "token": os.getenv("POLLI_TOKEN"),
        "referrer": "elixpoart",
        "max_tokens": 400,
        "seed": random.randint(1000, 1000000)
    }
    
    try:
        response = requests.post("https://text.pollinations.ai/openai", json=payload, timeout=30)
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
    """Generate a comprehensive fallback instruction based on text analysis"""
    text_lower = text.lower()
    
    # Analyze for multiple speakers
    speaker_indicators = ["said", "replied", "asked", "shouted", "whispered", "\"", "'"]
    has_dialogue = any(indicator in text_lower for indicator in speaker_indicators)
    
    # Analyze emotional content
    excitement_words = ["exciting", "amazing", "wow", "awesome", "incredible", "fantastic", "brilliant"]
    calm_words = ["calm", "peaceful", "gentle", "soft", "quiet", "serene", "tranquil"]
    serious_words = ["serious", "important", "urgent", "critical", "grave", "solemn"]
    humor_words = ["funny", "joke", "laugh", "humor", "silly", "hilarious", "amusing"]
    sad_words = ["sad", "tragic", "sorrowful", "melancholy", "grief", "mourning"]
    
    # Determine primary emotion and scene
    if any(word in text_lower for word in excitement_words):
        emotion = "excited"
        scene = "Speak with vibrant enthusiasm and bright energy, using [excited] vocal delivery. Voice should sparkle with genuine excitement, using animated tones and lively pacing. Add subtle [background music: upbeat] to enhance the joyful atmosphere. Create an environment that feels energetic and celebratory."
        
    elif any(word in text_lower for word in calm_words):
        emotion = "calm"
        scene = "Use a [calm] soft, soothing voice with gentle warmth. Speak with measured, peaceful pacing in an intimate, comforting atmosphere. Add subtle [ambient: nature sounds] like gentle breeze or soft rainfall. Voice should feel like a warm embrace with [close mic] intimacy, creating tranquility and safety."
        
    elif any(word in text_lower for word in serious_words):
        emotion = "serious"
        scene = "Adopt a clear, authoritative tone with focused intensity using [serious] delivery. Speak with measured gravity and purposeful pacing. Create an atmosphere of importance with [reverb] that suggests a formal setting. Use [clear] recording quality for maximum impact and attention."
        
    elif any(word in text_lower for word in humor_words):
        emotion = "happy"
        scene = "Use a [happy] playful, warm voice with natural [laughing] moments and light-hearted energy. Speak with bouncy rhythm and mischievous undertones. Add cheerful [background music: light jazz] and occasional [sound effect: gentle chuckles]. Create a jovial atmosphere filled with warmth and good humor."
        
    elif any(word in text_lower for word in sad_words):
        emotion = "sad"
        scene = "Employ a [sad] gentle, empathetic voice with emotional depth and vulnerability. Use slower pacing with thoughtful [pause] moments. Add subtle [background music: melancholic piano] and soft [ambient: distant rain]. Voice should convey genuine emotion with [close mic] intimacy."
        
    else:
        emotion = "conversational"
        if has_dialogue:
            scene = "Create natural multi-speaker dialogue with distinct voices for each speaker. Use [Speaker A] and [Speaker B] tags for voice assignment. Incorporate natural conversational elements like [pause], [thoughtful] moments, and emotional responses. Add subtle [ambient: coffee shop] background for realistic dialogue environment."
        else:
            scene = "Speak with natural conversational warmth and genuine human connection. Use a balanced, expressive voice with organic pacing and authentic emotional undertones. Add gentle [background music: ambient] and create a comfortable, engaging atmosphere like chatting with a trusted friend in a cozy setting."
    
    # Add music suggestions based on content
    music_suggestions = ""
    if "story" in text_lower or "once upon" in text_lower:
        music_suggestions = " Consider [background music: cinematic] for storytelling sections."
    elif "news" in text_lower or "report" in text_lower:
        music_suggestions = " Use [clear] professional delivery with minimal background elements."
    elif "meditation" in text_lower or "relax" in text_lower:
        music_suggestions = " Include [background music: ambient meditation] and [ambient: soft nature sounds]."
    
    return f"""
(
"You are a masterful voice performer bringing text to life with authentic human artistry using Higgs Audio v2."
"Higgs v2 is a powerful foundation model that supports speech, music, and sound events simultaneously in one unified system."
"Channel the energy of a skilled actor - make every word breathe with genuine emotion and personality."
"Use natural vocal textures, micro-pauses, emotional inflections, and dynamic pacing to create a captivating performance."
"Utilize Higgs v2's advanced capabilities: multi-speaker dialogues, background music, sound effects, and emotional expression."
"Available tags include: [emotions], [Speaker Name], [background music: genre], [sound effect: type], [ambient: environment], [pause], [whisper], [shout], [laughing], [echo], [reverb], [close mic], [distant], and many more."
"For multi-speaker content, use [Speaker A], [Speaker B] format or character names like [Alice], [Bob]."
"Avoid robotic delivery - embrace the beautiful imperfections and nuances of human speech."
"Generate audio following instruction."
"<|scene_desc_start|>"
{scene}{music_suggestions}
"<|scene_desc_end|>"
)
    """

async def generate_higgs_transcript(text: str, include_music: bool = True, include_sound_effects: bool = True) -> str:
    """
    Generate a properly formatted transcript for Higgs v2 with all appropriate tags
    """
    logger.info(f"Generating Higgs v2 transcript for: {text}")
    
    transcript_instruction = f"""
You are an expert transcript generator for Higgs Audio v2. Convert the following text into a properly formatted transcript using Higgs v2 tags.

AVAILABLE HIGGS V2 TAGS:
- Emotions: [happy], [sad], [angry], [excited], [calm], [surprised], [thoughtful], [serious]
- Vocal Effects: [whisper], [shout], [laughing], [crying], [breathless], [echo], [reverb]
- Audio Quality: [close mic], [distant], [filtered], [clear]
- Pacing: [fast], [slow], [pause], [long pause], [rushed], [drawn out]
- Music: [background music: genre] (classical, jazz, ambient, electronic, cinematic, etc.)
- Sound Effects: [sound effect: type] (rain, birds, applause, footsteps, door, phone, etc.)
- Ambient: [ambient: environment] (nature sounds, coffee shop, library, etc.)
- Speakers: [Speaker Name] or [Character Name] for multi-speaker content
- Special: [silence], [music fades in], [music fades out]

FORMATTING RULES:
1. Place speaker tags before their dialogue: [Alice] Hello there!
2. Include emotional tags within appropriate context: That's [excited] absolutely amazing!
3. Add music/sound effects at natural transition points
4. Use pauses and pacing for dramatic effect
5. Balance spoken content with atmospheric elements

Generate a complete transcript with appropriate tags based on the content. Include music: {"yes" if include_music else "no"}, sound effects: {"yes" if include_sound_effects else "no"}.

Text to convert: {text}
"""

    payload = {
        "model": "mistral",
        "messages": [
            {"role": "system", "content": transcript_instruction},
            {"role": "user", "content": f"Convert this to Higgs v2 transcript: {text}"}
        ],
        "temperature": 0.8,
        "stream": False,
        "private": True,
        "token": os.getenv("POLLI_TOKEN"),
        "referrer": "elixpoart",
        "max_tokens": 500,
        "seed": random.randint(1000, 1000000)
    }
    
    try:
        response = requests.post("https://text.pollinations.ai/openai", json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        transcript = data["choices"][0]["message"]["content"]
        if "---" in transcript and "**Sponsor**" in transcript:
            sponsor_start = transcript.find("---")
            transcript = transcript[:sponsor_start].strip()
            
        return transcript.strip()
        
    except Exception as e:
        logger.error(f"Transcript generation failed: {e}")
        return await _get_fallback_transcript(text, include_music, include_sound_effects)

async def _get_fallback_transcript(text: str, include_music: bool, include_sound_effects: bool) -> str:
    """Generate fallback transcript with Higgs v2 tags"""
    
    # Detect if it's dialogue
    has_quotes = '"' in text or "'" in text
    has_dialogue_words = any(word in text.lower() for word in ["said", "asked", "replied", "shouted", "whispered"])
    
    if has_quotes or has_dialogue_words:
        # Multi-speaker format
        base_transcript = f"[background music: ambient]\n[Narrator] {text}\n[music fades out]"
    else:
        # Single speaker format
        emotion_tag = ""
        if any(word in text.lower() for word in ["exciting", "amazing", "wow"]):
            emotion_tag = "[excited] "
        elif any(word in text.lower() for word in ["calm", "peaceful", "gentle"]):
            emotion_tag = "[calm] "
        elif any(word in text.lower() for word in ["important", "serious", "urgent"]):
            emotion_tag = "[serious] "
        
        music_part = "[background music: ambient]\n" if include_music else ""
        sound_part = "[ambient: quiet room]\n" if include_sound_effects else ""
        
        base_transcript = f"{music_part}{sound_part}{emotion_tag}{text}\n[pause]"
        
        if include_music:
            base_transcript += "\n[music fades out]"
    
    return base_transcript

async def generate_complete_higgs_instruction(text: str, include_music: bool = True, include_sound_effects: bool = True, voice_style: str = "natural") -> dict:
    """
    Generate both system instruction and formatted transcript for Higgs v2
    """
    logger.info(f"Generating complete Higgs v2 instruction set")
    
    # Generate system instruction
    system_instruction = await generate_higgs_system_instruction(text)
    
    # Generate formatted transcript
    transcript = await generate_higgs_transcript(text, include_music, include_sound_effects)
    
    return {
        "system_instruction": system_instruction,
        "formatted_transcript": transcript,
        "higgs_v2_info": {
            "model_capabilities": [
                "24kHz high-fidelity audio generation",
                "Multi-speaker dialogue with automatic voice assignment", 
                "Zero-shot voice cloning with reference audio",
                "Emotional expression based on text semantics",
                "Background music and sound effects generation",
                "Natural prosody and rhythm adaptation",
                "Multilingual support",
                "Simultaneous speech, music, and sound event generation"
            ],
            "supported_tags": {
                "emotions": ["happy", "sad", "angry", "excited", "calm", "surprised", "thoughtful", "serious"],
                "vocal_effects": ["whisper", "shout", "laughing", "crying", "breathless", "echo", "reverb"],
                "audio_quality": ["close mic", "distant", "filtered", "clear"],
                "pacing": ["fast", "slow", "pause", "long pause", "rushed", "drawn out"],
                "music": ["background music: [genre]", "music fades in", "music fades out"],
                "sound_effects": ["sound effect: [type]", "ambient: [environment]"],
                "speakers": ["[Speaker Name]", "[Character Name]"],
                "special": ["silence", "ref_text", "ref_audio", "text"]
            }
        }
    }

if __name__ == "__main__":
    async def main():
        user_prompt = "Hello everyone! I'm so excited to share this amazing news with you today!"
        system_instruction = await generate_higgs_system_instruction(user_prompt)
        logger.info("System instruction generated successfully")
        
    asyncio.run(main())