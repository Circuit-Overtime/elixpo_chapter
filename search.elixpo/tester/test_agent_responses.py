import sys
from pathlib import Path
import unittest
from unittest.mock import AsyncMock, patch
from quart import Quart

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "lixsearch"))

from agentRuntime.state import ResponseStateStore, canonical_conversation_id
import importlib.util

_spec = importlib.util.spec_from_file_location("responses_gateway", ROOT / "lixsearch" / "app" / "gateways" / "responses.py")
responses = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(responses)


class FakePipeline:
    def __init__(self, client):
        self.client = client
        self.operations = []

    def set(self, key, value, ex=None):
        self.operations.append((key, value))
        return self

    def execute(self):
        for key, value in self.operations:
            self.client.values[key] = value


class FakeRedis:
    def __init__(self):
        self.values = {}

    def get(self, key):
        return self.values.get(key)

    def pipeline(self, transaction=True):
        return FakePipeline(self)


class FakeRunner:
    calls = []

    async def run(self, agent, prompt, history=None):
        self.calls.append((agent, prompt, list(history or [])))
        return {
            "agent": "coding",
            "role": "code",
            "model": "qwen-coder",
            "response": {
                "choices": [{"message": {"role": "assistant", "content": f"answer:{prompt}"}}],
                "usage": {"prompt_tokens": 4, "completion_tokens": 2, "total_tokens": 6},
            },
        }


class AgentResponseTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        FakeRunner.calls.clear()
        self.redis = FakeRedis()
        self.state = ResponseStateStore(client=self.redis, ttl_seconds=60)
        self.app = Quart(__name__)

        async def endpoint():
            return await responses.responses(True)

        self.app.add_url_rule("/v1/responses", "responses", endpoint, methods=["POST"])

    async def test_previous_response_id_restores_history(self):
        with patch.object(responses, "AgentRunner", FakeRunner), patch.object(responses, "_remember_turn", AsyncMock()):
            first = await responses._run_response({"model": "coding", "input": "first"}, self.state)
            second = await responses._run_response({
                "model": "coding", "input": "second", "previous_response_id": first["id"]
            }, self.state)
        self.assertEqual(second["previous_response_id"], first["id"])
        self.assertEqual(second["conversation"]["id"], first["conversation"]["id"])
        self.assertEqual([item["content"] for item in FakeRunner.calls[-1][2]], ["first", "answer:first"])

    async def test_store_false_writes_no_state(self):
        with patch.object(responses, "AgentRunner", FakeRunner), patch.object(responses, "_remember_turn", AsyncMock()) as remember:
            result = await responses._run_response({"input": "private", "store": False}, self.state)
        self.assertFalse(result["store"])
        self.assertIsNone(self.state.get_response(result["id"]))
        remember.assert_not_awaited()

    async def test_http_json_and_sse_contracts(self):
        with patch.object(responses, "AgentRunner", FakeRunner), patch.object(responses, "ResponseStateStore", return_value=self.state), patch.object(responses, "_remember_turn", AsyncMock()):
            client = self.app.test_client()
            reply = await client.post("/v1/responses", json={"model": "coding", "input": "hello"})
            self.assertEqual(reply.status_code, 200)
            body = await reply.get_json()
            self.assertEqual(body["object"], "response")
            self.assertTrue(body["id"].startswith("resp_"))
            self.assertEqual(body["output"][0]["content"][0]["type"], "output_text")

            streamed = await client.post("/v1/responses", json={"input": "stream me", "stream": True})
            stream_body = (await streamed.get_data()).decode()
            self.assertIn("event: response.created", stream_body)
            self.assertIn("event: response.output_text.delta", stream_body)
            self.assertIn("event: response.completed", stream_body)
            self.assertIn("data: [DONE]", stream_body)

    def test_cli_session_alias_is_stable_and_private(self):
        first = canonical_conversation_id("my-project")
        self.assertEqual(first, canonical_conversation_id("my-project"))
        self.assertTrue(first.startswith("conv_"))
        self.assertNotIn("my-project", first)


if __name__ == "__main__":
    unittest.main()
