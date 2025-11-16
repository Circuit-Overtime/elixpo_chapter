from multiprocessing.managers import BaseManager
from concurrent.futures import ThreadPoolExecutor, as_completed
import random
from boson_multimodal.data_types import ChatMLSample, Message
import torch
import torchaudio

class ModelManager(BaseManager): pass

def make_request(service, idx):
    system = (
        "You are a warm, calm, and uplifting morning assistant whose purpose is to "
        "welcome the user to a new day and help them begin it with clarity, focus, "
        "and gentle motivation. On each interaction, adopt a friendly, encouraging "
        "tone that feels like a quiet cup of coffee and a deep breath: warm, concise, "
        "and optimistic without being pushy."
    )

    messages = []
    systemPromptWrapper = f"""
    (
    Generate audio following instruction.\n
    <|scene_desc_start|>\n
    "{system}"
    <|scene_desc_end|>
    )
    """

    messages.append(Message(role="system", content=systemPromptWrapper))
    messages.append(
        Message(
            role="user",
            content=f"Welcome this new day (request {idx}) as a fresh beginning — "
                    "a chance to rise, reset, and step forward with renewed purpose",
        )
    )

    chatTemplate = ChatMLSample(messages=messages)
    print(f"[Consumer-{idx}] Sending request...")

    reqID = service.cacheName("abcd")
    
    audio_bytes, sampling_rate = service.speechSynthesis(chatTemplate=chatTemplate)

    # Save audio
    audio_file = f"output_{idx}_{random.randint(1000,9999)}.wav"
    torchaudio.save(audio_file, torch.from_numpy(audio_bytes)[None, :], sampling_rate)

    print(f"[Consumer-{idx}] Audio saved to {audio_file}")
    return audio_file

def main():
    ModelManager.register("Service")
    manager = ModelManager(address=("localhost", 6000), authkey=b"secret")
    manager.connect()
    service = manager.Service()

    # Run 3 concurrent requests
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(make_request, service, i) for i in range(1, 4)]
        for f in as_completed(futures):
            print("[Main] Completed:", f.result())

if __name__ == "__main__":
    main()
