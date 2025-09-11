import requests

url = "http://51.159.148.245:8000/audio"
payload = {
    "messages": [
        {
            "role": "system",
            "content": [
                {"type": "text", "text": "Very calm and soothing voice, read the following text."}
            ]
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Let your worries drift away like clouds, and let peace fill your heart."},
                {
                    "type": "voice",
                    "voice": {
                        "name": "ash",  
                        "format": "wav"
                    }
                },
            ]
        }
    ],
    "seed": 43
}



response = requests.post(url, json=payload)

if response.headers.get("Content-Type") == "audio/wav":
    with open("output.wav", "wb") as f:
        f.write(response.content)
    print("Audio saved as output.wav")
else:
    print(response.json())