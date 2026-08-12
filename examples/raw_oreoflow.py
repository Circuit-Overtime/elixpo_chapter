#!/usr/bin/env python3
"""Minimal dry-run/live verification of the public OreoFlow API."""
from __future__ import annotations

import argparse
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from oreoflow import Budget, Message, Router, load_models_config

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODELS = ROOT / "config" / "models.yaml"
DEFAULT_PROMPT = "Reply with exactly: OreoFlow is ready."


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--role", default="prose", help="Logical role from models.yaml")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT)
    parser.add_argument("--models", type=Path, default=DEFAULT_MODELS)
    parser.add_argument("--env-file", type=Path, default=ROOT / ".env.local")
    parser.add_argument("--max-tokens", type=int, default=200)
    parser.add_argument("--live", action="store_true", help="Perform a provider request")
    parser.add_argument("--stream", action="store_true", help="Stream provider chunks")
    return parser.parse_args()


async def run(args: argparse.Namespace) -> None:
    load_dotenv(args.env_file, override=False)
    models = load_models_config(args.models)
    budget = Budget("raw-oreoflow-test", limit=max(1_000, args.max_tokens * 4))
    key = os.getenv("POLLINATIONS_API_KEY", "")
    router = Router("raw-oreoflow-test", models=models, api_key=key, budget=budget)
    try:
        selected = router.resolve(args.role)
        print(f"role={args.role} model={selected['model']} tools={selected.get('tools', True)}")
        if not args.live:
            print("dry-run=ok (add --live to call the provider)")
            return
        if not key:
            raise SystemExit("POLLINATIONS_API_KEY is missing from .env.local")
        messages = [Message(role="user", content=args.prompt)]
        if args.stream:
            async for chunk in router.stream(
                args.role, messages, effort="low", max_tokens=args.max_tokens
            ):
                for choice in chunk.choices:
                    if choice.delta.content:
                        print(choice.delta.content, end="", flush=True)
            print()
        else:
            response = await router.call(
                args.role, messages, effort="low", max_tokens=args.max_tokens
            )
            print(response.choices[0].message.content or "")
            print(f"usage={response.usage.total_tokens} remaining={budget.remaining()}")
    finally:
        await router.aclose()


def main() -> None:
    asyncio.run(run(parse_args()))


if __name__ == "__main__":
    main()
