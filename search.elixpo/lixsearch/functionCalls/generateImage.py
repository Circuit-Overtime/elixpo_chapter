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
    """Generate an image, store it on disk, and return the full public URL.

    The upstream fetch runs in a thread so it doesn't block the event loop,
    but this function AWAITS completion — the caller gets the URL only after
    the image is actually stored and ready to serve.
    """
    model = next(_model_cycle)
    seed = random.randint(0, 10000)
    image_id = str(uuid.uuid4())
    url = f"{_BASE_URL}/api/image/{image_id}"

    upstream_url = (
        f"{POLLINATIONS_ENDPOINT_IMAGE}{quote(prompt)}"
        f"?model={model}&height=462&width=768&seed={seed}&quality=hd&enhance=true"
    )
    headers = {"Authorization": f"Bearer {os.getenv('TOKEN')}"}

    t0 = time.perf_counter()
    try:
        response = await asyncio.to_thread(
            requests.get, upstream_url, headers=headers, timeout=60
        )
        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "image/png")

        # Verify we actually got image bytes, not an error page
        if not content_type.startswith("image/"):
            raise ValueError(f"Expected image, got Content-Type: {content_type}")
        if len(response.content) < 1000:
            raise ValueError(f"Response too small to be an image: {len(response.content)} bytes")

        from app.gateways.image import store_image
        store_image(image_id, response.content, content_type)
        elapsed = time.perf_counter() - t0
        print(f"[Image] Upstream: {upstream_url[:120]}")
        print(f"[Image] Generated with {model} in {elapsed:.2f}s ({len(response.content)} bytes) -> {image_id}")

    except requests.exceptions.Timeout:
        print(f"[Image] TIMEOUT: Upstream took >60s for model={model}")
        raise RuntimeError(f"Image generation timed out (model={model})")
    except requests.exceptions.HTTPError as e:
        print(f"[Image] HTTP ERROR: {e.response.status_code} from {model} — {e.response.text[:200]}")
        raise RuntimeError(f"Image generation failed: HTTP {e.response.status_code}")
    except ValueError as e:
        print(f"[Image] INVALID RESPONSE: {e}")
        raise RuntimeError(str(e))
    except Exception as e:
        print(f"[Image] FAILED: {type(e).__name__}: {e}")
        raise

    return url


if __name__ == "__main__":
    async def main():
        prompt = (
            "A lone celestial sorceress standing atop a crystalline tower, "
            "her flowing iridescent robes dissolving into trails of stardust, "
            "overlooking an endless ocean of glowing nebulae and floating ancient ruins, "
            "dramatic golden-hour lighting piercing through cosmic clouds, "
            "ultra-detailed digital painting, cinematic atmosphere"
        )
        print(f"Generating image for: {prompt[:60]}...")
        try:
            url = await create_image_from_prompt(prompt)
            print(f"Success: {url}")
        except Exception as e:
            print(f"Failed: {e}")

    asyncio.run(main())
