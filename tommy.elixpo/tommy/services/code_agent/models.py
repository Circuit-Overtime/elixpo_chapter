"""
Multi-model router for the coding agent using Pollinations API.

All models are accessed through Pollinations API:
- gemini-large: Understanding - large context for codebase analysis
- claude-large: Coding - best code quality
- claude: Testing, quick fixes - fast iteration
- kimi-k2-thinking: Autonomous reviewer - replaces human-in-the-loop
"""

import asyncio
import json
import logging
import random
from typing import Optional, Literal
from dataclasses import dataclass, field

import aiohttp

from ... import config
from ...constants import POLLINATIONS_API_BASE

logger = logging.getLogger(__name__)

TaskType = Literal["planning", "coding", "testing", "review", "understanding", "search", "quick"]

MAX_RETRIES = 3
RETRY_DELAY = 5
MAX_SEED = 2**31 - 1

POLLINATIONS_CHAT_URL = f"{POLLINATIONS_API_BASE}/v1/chat/completions"


@dataclass
class ModelConfig:
    name: str
    max_tokens: int
    supports_tools: bool = True
    supports_vision: bool = False
    thinking_enabled: bool = False
    thinking_budget: int = 0
    reasoning_effort: str = "low"


MODELS = {
    "gemini-large": ModelConfig(
        name="gemini-large",
        max_tokens=65536,
        supports_tools=True,
        supports_vision=True,
        thinking_enabled=False,
    ),
    "claude-large": ModelConfig(
        name="claude-large",
        max_tokens=64000,
        supports_tools=True,
        supports_vision=True,
        thinking_enabled=False,
    ),
    "claude": ModelConfig(
        name="claude",
        max_tokens=16000,
        supports_tools=True,
        supports_vision=True,
        thinking_enabled=False,
    ),
    "kimi-k2-thinking": ModelConfig(
        name="kimi-k2-thinking",
        max_tokens=32000,
        supports_tools=True,
        supports_vision=False,
        thinking_enabled=True,
        thinking_budget=10000,
        reasoning_effort="high",
    ),
    "perplexity-fast": ModelConfig(
        name="perplexity-fast",
        max_tokens=8192,
        supports_tools=False,
        supports_vision=False,
        thinking_enabled=False,
    ),
    "perplexity-reasoning": ModelConfig(
        name="perplexity-reasoning",
        max_tokens=16000,
        supports_tools=False,
        supports_vision=False,
        thinking_enabled=True,
        thinking_budget=5000,
        reasoning_effort="medium",
    ),
}

TASK_MODEL_MAP: dict[TaskType, str] = {
    "understanding": "gemini-large",
    "planning": "claude",
    "coding": "claude-large",
    "testing": "claude",
    "review": "kimi-k2-thinking",
    "search": "perplexity-fast",
    "quick": "claude",
}

TASK_PARAMS: dict[TaskType, dict] = {
    "understanding": {
        "temperature": 0.3,
        "top_p": 0.9,
        "frequency_penalty": 0,
        "presence_penalty": 0,
    },
    "planning": {
        "temperature": 0.7,
        "top_p": 0.95,
        "frequency_penalty": 0.1,
        "presence_penalty": 0.1,
    },
    "coding": {
        "temperature": 0.2,
        "top_p": 0.9,
        "frequency_penalty": 0,
        "presence_penalty": 0,
    },
    "testing": {
        "temperature": 0.3,
        "top_p": 0.9,
        "frequency_penalty": 0,
        "presence_penalty": 0,
    },
    "review": {
        "temperature": 0.4,
        "top_p": 0.9,
        "frequency_penalty": 0,
        "presence_penalty": 0.1,
    },
    "search": {
        "temperature": 0.3,
        "top_p": 0.9,
        "frequency_penalty": 0,
        "presence_penalty": 0,
    },
    "quick": {
        "temperature": 0.3,
        "top_p": 0.9,
        "frequency_penalty": 0,
        "presence_penalty": 0,
    },
}


class ModelRouter:

    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None
        self._connector: Optional[aiohttp.TCPConnector] = None
        self._initialized = False

    async def initialize(self):
        if self._session is None or self._session.closed:
            self._connector = aiohttp.TCPConnector(
                limit=50,
                limit_per_host=20,
                keepalive_timeout=60,
                enable_cleanup_closed=True,
                ttl_dns_cache=300,
                use_dns_cache=True
            )
            self._session = aiohttp.ClientSession(
                connector=self._connector,
                timeout=aiohttp.ClientTimeout(total=600, connect=10)
            )
        self._initialized = True
        logger.info("ModelRouter initialized with Pollinations API")

    async def get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            await self.initialize()
        if self._session is None:
            raise RuntimeError("Failed to initialize aiohttp session")
        return self._session

    def get_model_for_task(self, task_type: TaskType, context_size: int = 0) -> str:
        if context_size > 150000:
            logger.info(f"Context size {context_size} > 150K, routing to gemini-large")
            return "gemini-large"
        return TASK_MODEL_MAP.get(task_type, "claude")

    def get_config(self, model_id: str) -> ModelConfig:
        return MODELS.get(model_id, MODELS["claude"])

    async def chat(
        self,
        model_id: str,
        messages: list[dict],
        task_type: Optional[TaskType] = None,
        tools: Optional[list[dict]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_response: bool = False,
    ) -> dict:
        if not self._initialized:
            await self.initialize()

        model_config = MODELS.get(model_id, MODELS["claude"])
        task_params = TASK_PARAMS.get(task_type, {}) if task_type else {}

        payload = self._build_payload(
            model_config=model_config,
            messages=messages,
            task_params=task_params,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
            json_response=json_response,
        )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config.pollinations_token}"
        }

        last_error = None

        for attempt in range(MAX_RETRIES):
            payload["seed"] = random.randint(0, MAX_SEED)

            try:
                session = await self.get_session()
                logger.debug(f"Pollinations API call to {model_id} (attempt {attempt + 1}/{MAX_RETRIES})")

                async with session.post(
                    POLLINATIONS_CHAT_URL,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=600)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_response(data, model_config)
                    else:
                        error_text = await response.text()
                        last_error = f"HTTP {response.status}: {error_text[:200]}"
                        logger.warning(f"Pollinations API error (attempt {attempt + 1}): {last_error}")

            except asyncio.TimeoutError:
                last_error = "Timeout after 600s"
                logger.warning(f"API timeout (attempt {attempt + 1})")
            except aiohttp.ClientError as e:
                last_error = f"Network error: {e}"
                logger.warning(f"Network error (attempt {attempt + 1}): {e}")
            except Exception as e:
                last_error = f"Error: {e}"
                logger.exception(f"API error (attempt {attempt + 1})")

            if attempt < MAX_RETRIES - 1:
                logger.info(f"Retrying in {RETRY_DELAY}s...")
                await asyncio.sleep(RETRY_DELAY)

        logger.error(f"All {MAX_RETRIES} API attempts failed for {model_id}. Last error: {last_error}")
        return {"content": "", "tool_calls": [], "thinking": None, "error": last_error}

    def _build_payload(
        self,
        model_config: ModelConfig,
        messages: list[dict],
        task_params: dict,
        tools: Optional[list[dict]],
        temperature: Optional[float],
        max_tokens: Optional[int],
        json_response: bool,
    ) -> dict:
        payload = {
            "model": model_config.name,
            "messages": messages,
            "max_tokens": max_tokens or model_config.max_tokens,
            "temperature": temperature if temperature is not None else task_params.get("temperature", 0.7),
            "seed": 0,
        }

        if json_response:
            payload["response_format"] = {"type": "json_object"}
        else:
            payload["response_format"] = {"type": "text"}

        if tools and model_config.supports_tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
            payload["parallel_tool_calls"] = True

        if model_config.thinking_enabled and model_config.thinking_budget > 0:
            payload["thinking"] = {
                "type": "enabled",
                "budget_tokens": model_config.thinking_budget,
            }
            payload["reasoning_effort"] = model_config.reasoning_effort

        return payload

    def _parse_response(self, data: dict, model_config: ModelConfig) -> dict:
        result = {"content": "", "tool_calls": [], "thinking": None}

        choices = data.get("choices", [])
        if choices:
            message = choices[0].get("message", {})
            result["content"] = message.get("content", "") or ""
            result["tool_calls"] = message.get("tool_calls", [])

            if model_config.thinking_enabled:
                result["thinking"] = (
                    message.get("reasoning_content") or
                    message.get("thinking") or
                    message.get("reasoning") or
                    None
                )

        if "usage" in data:
            result["usage"] = data["usage"]

        return result

    async def chat_stream(
        self,
        model_id: str,
        messages: list[dict],
        task_type: Optional[TaskType] = None,
        tools: Optional[list[dict]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ):
        if not self._initialized:
            await self.initialize()

        model_config = MODELS.get(model_id, MODELS["claude"])
        task_params = TASK_PARAMS.get(task_type, {}) if task_type else {}

        payload = self._build_payload(
            model_config=model_config,
            messages=messages,
            task_params=task_params,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
            json_response=False,
        )

        payload["stream"] = True
        payload["stream_options"] = {"include_usage": True}
        payload["seed"] = random.randint(0, MAX_SEED)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config.pollinations_token}"
        }

        try:
            session = await self.get_session()

            async with session.post(
                POLLINATIONS_CHAT_URL,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=600)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Stream error: HTTP {response.status}: {error_text[:200]}")
                    return

                async for line in response.content:
                    line = line.decode("utf-8").strip()
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            logger.exception(f"Stream error: {e}")

    async def web_search(
        self,
        query: str,
        reasoning: bool = False,
        max_results: int = 5,
    ) -> dict:
        model_id = "perplexity-reasoning" if reasoning else "perplexity-fast"

        messages = [
            {
                "role": "system",
                "content": f"""You are a web search assistant. Search for the most relevant, up-to-date information.
Return {max_results} most relevant results with:
- Title
- URL (if available)
- Brief summary
- Key facts

Focus on authoritative sources. Include dates when relevant.""",
            },
            {
                "role": "user",
                "content": query,
            },
        ]

        result = await self.chat(
            model_id=model_id,
            messages=messages,
            task_type="search",
            temperature=0.2,
        )

        return {
            "content": result.get("content", ""),
            "sources": result.get("sources", []),
            "thinking": result.get("thinking"),
            "model": model_id,
        }

    async def search_for_code_context(
        self,
        topic: str,
        language: str = "python",
    ) -> dict:
        query = f"""Search for the latest documentation, examples, and best practices for:
Topic: {topic}
Language: {language}

Focus on:
1. Official documentation
2. Recent GitHub examples
3. Best practices and common patterns
4. Known issues or gotchas

Return structured information that would help implement this in code."""

        return await self.web_search(query, reasoning=True, max_results=5)

    async def search_error(self, error_message: str, context: str = "") -> dict:
        query = f"""How to fix this error:
{error_message}

Context: {context}

Find:
1. Common causes
2. Solutions that worked for others
3. Related GitHub issues or Stack Overflow answers"""

        return await self.web_search(query, reasoning=False, max_results=5)

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
        if self._connector:
            await self._connector.close()
            self._connector = None
        self._initialized = False


model_router = ModelRouter()
