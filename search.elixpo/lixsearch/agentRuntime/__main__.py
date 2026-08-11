from __future__ import annotations

import argparse
import asyncio
import json

from agentRuntime import AGENT_SPECS, AgentRunner


def main() -> int:
    parser = argparse.ArgumentParser(description="Run one skill-scoped lixSearch agent through OreoFlow")
    parser.add_argument("--agent", choices=("auto", *AGENT_SPECS), default="auto")
    parser.add_argument("--prompt", required=True, help="Literal user prompt")
    parser.add_argument("--dry-run", action="store_true", help="Print routing/model/tools without calling Pollinations")
    args = parser.parse_args()

    runner = AgentRunner()
    if args.dry_run:
        print(json.dumps(runner.prepare(args.agent, args.prompt).to_dict(), indent=2))
        return 0
    print(json.dumps(asyncio.run(runner.run(args.agent, args.prompt)), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
