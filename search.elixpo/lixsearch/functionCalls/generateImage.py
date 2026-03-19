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

# Base URL for constructing full image links in API responses
_BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://search.elixpo.com").rstrip("/")


async def create_image_from_prompt(prompt: str) -> str:
    """Generate an image and return its URL immediately.

    The image ID and URL are created upfront.  The actual upstream fetch +
    disk write runs in a background task so the pipeline doesn't block
    waiting for it.  The serve endpoint will wait briefly for the file to
    appear if a client requests it before the background task finishes.
    """
    model = next(_model_cycle)
    seed = random.randint(0, 10000)
    image_id = str(uuid.uuid4())
    url = f"{_BASE_URL}/api/image/{image_id}"

    upstream_url = (
        f"{POLLINATIONS_ENDPOINT_IMAGE}{quote(prompt)}"
        f"?model=dirtberry-pro&height=512&width=512&seed={seed}&quality=hd&enhance=true"
    )
    headers = {"Authorization": f"Bearer {os.getenv('TOKEN')}"}

    async def _fetch_and_store():
        t0 = time.perf_counter()
        try:
            response = await asyncio.to_thread(
                requests.get, upstream_url, headers=headers, timeout=60
            )
            response.raise_for_status()
            from app.gateways.image import store_image
            content_type = response.headers.get("Content-Type", "image/png")
            store_image(image_id, response.content, content_type)
            print(f"Image generated with {model} in {time.perf_counter() - t0:.2f} seconds")
        except Exception as e:
            print(f"Background image generation failed: {e}")

    # Fire and forget — pipeline continues immediately
    asyncio.create_task(_fetch_and_store())

    return url


if __name__ == "__main__":
    async def main():
        url = await create_image_from_prompt("an oil painting with japaneese script of a cat sitting on a windowsill, looking outside at a rainy day")
        print(url)
    asyncio.run(main())
