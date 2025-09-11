import requests
import base64
from pydub import AudioSegment

# audio = AudioSegment.from_file("voice_clone.mp3", format="mp3")
# audio.export("voice.wav", format="wav")
# with open("voice.wav", "rb") as f:
#     audio_bytes = f.read()
# audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

# Insert the base64 wav data into the payload for voice cloning

url = "http://51.159.148.245:8000/audio"
payload = {
    "messages": [
        {
            "role": "system",
            "content": [
                {"type": "text", "text": "A very scary ghastly sequel of a movie. Read the text as it is!"}
            ]
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "HAHHA! Welcome to my palace of laughter!"},
                {
                    "type": "voice",
                    "voice": {
                        "name": "ghost",
                        "format": "wav"
                    }
                }
            ]
            }
            ],
            "seed": 43
        }
   




response = requests.post(url, json=payload)

if response.headers.get("Content-Type") == "audio/wav":
    with open("output2.wav", "wb") as f:
        f.write(response.content)
    print("Audio saved as output.wav")

else:
    print(response.json())