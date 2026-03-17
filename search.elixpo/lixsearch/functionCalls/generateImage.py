import asyncio
import itertools
import random
import os
import uuid
import requests
from urllib.parse import quote
from dotenv import load_dotenv
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.config import POLLINATIONS_ENDPOINT_IMAGE, IMAGE_MODEL1, IMAGE_MODEL2

load_dotenv()

# Round-robin iterator between the two image models
_model_cycle = itertools.cycle([IMAGE_MODEL1, IMAGE_MODEL2])


async def create_image_from_prompt(prompt: str) -> str:
    model = next(_model_cycle)
    seed = random.randint(0, 10000)
    t0 = time.perf_counter()
    upstream_url = f"{POLLINATIONS_ENDPOINT_IMAGE}{quote(prompt)}?model={model}&height=512&width=512&seed={seed}&quality=hd&enhance=true"

    headers = {
        "Authorization": f"Bearer {os.getenv('TOKEN')}"
    }

    response = await asyncio.to_thread(
        requests.get, upstream_url, headers=headers, timeout=60
    )
    response.raise_for_status()
    print(f"Image generated with {model} in {time.perf_counter() - t0:.2f} seconds")

    # Store image in memory and return self-domain URL
    from app.gateways.image import store_image
    image_id = str(uuid.uuid4())
    content_type = response.headers.get("Content-Type", "image/png")
    store_image(image_id, response.content, content_type)

    return f"/api/image/{image_id}"


if __name__ == "__main__":
    async def main():
        url = await create_image_from_prompt("an oil painting with japaneese script of a cat sitting on a windowsill, looking outside at a rainy day")
        print(url)
    asyncio.run(main())
