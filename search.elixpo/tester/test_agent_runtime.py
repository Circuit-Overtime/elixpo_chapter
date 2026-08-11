import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "lixsearch"))

from agentRuntime import AgentRunner, route_request


class AgentRuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runner = AgentRunner()

    def test_zero_cost_routing_for_obvious_requests(self):
        self.assertEqual(route_request("Generate an image of a lunar city"), "image-maker")
        self.assertEqual(route_request("Debug this Python function"), "coding")
        self.assertEqual(route_request("Export this report as a PDF"), "pdf-maker")
        self.assertEqual(route_request("Find today's weather online"), "web-search")
        self.assertEqual(route_request("Rewrite this email"), "writing")
        self.assertEqual(route_request("What did we discuss earlier?"), "memory")
        self.assertEqual(route_request("Explain entropy"), "decision")

    def test_web_agent_uses_cheapest_role_and_scoped_tools(self):
        run = self.runner.prepare("web-search", "Find current Python news")
        names = {tool["function"]["name"] for tool in run.tools}
        self.assertEqual(run.model, "nova-fast")
        self.assertEqual(
            names,
            {"web_search", "fetch_full_text", "get_local_time", "deep_research"},
        )

    def test_image_agent_receives_only_create_image(self):
        run = self.runner.prepare("image-maker", "Draw a blue fox")
        self.assertEqual(run.model, "nova-fast")
        self.assertEqual(
            [tool["function"]["name"] for tool in run.tools],
            ["create_image"],
        )

    def test_coding_agent_uses_qwen_coder(self):
        run = self.runner.prepare("coding", "Write a parser")
        self.assertEqual(run.model, "qwen-coder")
        self.assertEqual(run.tools, ())

    def test_literal_prompt_is_preserved(self):
        prompt = "Hard-coded prompt: write exactly three lines."
        run = self.runner.prepare("writing", prompt)
        self.assertEqual(run.messages[-1], {"role": "user", "content": prompt})

    def test_auto_uses_decision_only_when_ambiguous(self):
        obvious = self.runner.prepare("auto", "Create an image of Saturn")
        ambiguous = self.runner.prepare("auto", "Explain entropy")
        self.assertEqual(obvious.agent, "image-maker")
        self.assertEqual(ambiguous.agent, "decision")
        self.assertEqual(ambiguous.max_tokens, 96)


if __name__ == "__main__":
    unittest.main()
