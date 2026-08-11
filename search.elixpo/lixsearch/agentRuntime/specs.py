"""Static agent contracts for fast, role-based OreoFlow routing."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AgentSpec:
    name: str
    role: str
    skills: tuple[str, ...]
    system_prompt: str
    max_tokens: int
    description: str


AGENT_SPECS: dict[str, AgentSpec] = {
    "decision": AgentSpec(
        name="decision",
        role="classify",
        skills=("orchestrate-search",),
        max_tokens=96,
        description="Classify only ambiguous requests.",
        system_prompt=(
            "Choose exactly one agent for the user request. Return JSON only as "
            '{"agent":"web-search|coding|writing|pdf-maker|image-maker|media|memory",'
            '"reason":"five words or fewer"}. Do not answer the request.'
        ),
    ),
    "web-search": AgentSpec(
        name="web-search",
        role="crawl",
        skills=("research-web",),
        max_tokens=700,
        description="Plan current web research and emit only relevant tool calls or evidence.",
        system_prompt="Use the attached web-research skill. Prefer the fewest sufficient tool calls.",
    ),
    "coding": AgentSpec(
        name="coding",
        role="code",
        skills=("write-code",),
        max_tokens=1800,
        description="Produce bounded repository-grounded code work.",
        system_prompt="Use the attached coding skill. Return concise implementation-ready output.",
    ),
    "writing": AgentSpec(
        name="writing",
        role="prose",
        skills=("write-content",),
        max_tokens=1400,
        description="Draft or revise supplied written content.",
        system_prompt="Use the attached writing skill. Return the requested artifact directly.",
    ),
    "pdf-maker": AgentSpec(
        name="pdf-maker",
        role="prose",
        skills=("write-content", "export-documents"),
        max_tokens=1200,
        description="Prepare content and emit one PDF export tool call.",
        system_prompt="Prepare final content, then call the PDF export tool exactly once.",
    ),
    "image-maker": AgentSpec(
        name="image-maker",
        role="prose",
        skills=("make-images",),
        max_tokens=300,
        description="Emit one image-generation tool call.",
        system_prompt="Preserve the visual request and call create_image exactly once.",
    ),
    "media": AgentSpec(
        name="media",
        role="classify",
        skills=("handle-media",),
        max_tokens=500,
        description="Inspect images, videos, or audio with minimal tools.",
        system_prompt="Use the attached media skill and select only the narrowest required tool.",
    ),
    "memory": AgentSpec(
        name="memory",
        role="classify",
        skills=("recall-memory",),
        max_tokens=300,
        description="Retrieve only relevant conversation context.",
        system_prompt="Use the attached memory skill and request only necessary history.",
    ),
    "synthesis": AgentSpec(
        name="synthesis",
        role="prose",
        skills=("synthesize-answer",),
        max_tokens=1800,
        description="Combine completed evidence into the final response.",
        system_prompt="Use the attached synthesis skill. Do not launch new tools.",
    ),
}
