import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "lixsearch"))

from pipeline.instruction import synthesis_instruction
from pipeline.response_builder import is_placeholder_or_fallback


class GroundedSynthesisTests(unittest.TestCase):
    def test_rejects_unresolved_weather_placeholders(self):
        draft = "Temperature: [Accurate temperature details]\nHumidity: [Accurate humidity level]"
        self.assertTrue(is_placeholder_or_fallback(draft))

    def test_accepts_concrete_weather_values(self):
        answer = "New Delhi is 31°C with 62% humidity."
        self.assertFalse(is_placeholder_or_fallback(answer))

    def test_synthesis_prompt_forbids_guessed_or_template_values(self):
        prompt = synthesis_instruction("What is the weather?")
        self.assertIn("Never emit bracketed placeholders", prompt)
        self.assertIn("could not be verified", prompt)


if __name__ == "__main__":
    unittest.main()
