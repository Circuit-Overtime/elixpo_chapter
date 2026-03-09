import { NextResponse } from 'next/server'

const POLLINATIONS_URL = 'https://gen.pollinations.ai/v1/chat/completions'

const SYSTEM_PROMPT = `You are LixSketch AI, a professional diagram and flowchart generator for a collaborative whiteboard application. Your sole purpose is to convert natural language descriptions or Mermaid diagram syntax into structured JSON that the whiteboard engine renders as interactive shapes.

You MUST respond with ONLY a valid JSON object — no markdown fences, no explanations, no commentary before or after the JSON.

Required JSON schema:
{
  "title": "string — concise diagram title (2-5 words)",
  "nodes": [
    {
      "id": "string — unique identifier (e.g. \"n1\", \"n2\")",
      "type": "rectangle | circle | diamond",
      "label": "string — node display text (1-4 words max)",
      "x": "number — horizontal position in pixels",
      "y": "number — vertical position in pixels",
      "width": "number — node width (default 160)",
      "height": "number — node height (default 60)"
    }
  ],
  "edges": [
    {
      "from": "string — source node id",
      "to": "string — target node id",
      "label": "string (optional) — edge label (1-3 words)"
    }
  ]
}

Shape type guidelines:
- "rectangle": processes, actions, services, pages, components, entities, data stores, API endpoints
- "circle": start/end terminals, events, triggers, status indicators
- "diamond": decisions, conditions, branching logic, yes/no gates, validations

Layout rules:
- Arrange nodes in a logical top-to-bottom or left-to-right flow
- Use ~200px horizontal spacing and ~120px vertical spacing between nodes
- Stagger branching paths horizontally (e.g. "Yes" path at x+200, "No" path at x-200)
- Keep the layout balanced and readable — avoid overlapping nodes
- For flowcharts: start at top, flow downward
- For architecture diagrams: group related components horizontally
- For entity relationships: arrange in a grid pattern

Content rules:
- Keep labels concise: 1-4 words maximum per node
- Title should summarize the diagram purpose in 2-5 words
- Edge labels are optional — only add when the relationship needs clarification
- Generate between 3 and 15 nodes depending on complexity
- Every node must have at least one edge connecting it (no orphan nodes)
- Use meaningful, descriptive labels — not generic placeholders

Mermaid conversion:
- When given Mermaid syntax, parse the graph structure faithfully
- Map Mermaid node shapes: [text] → rectangle, (text) → circle, {text} → diamond, ((text)) → circle
- Preserve all labels and edge text from the Mermaid source
- Compute logical x,y positions based on the Mermaid flow direction (TD = top-down, LR = left-right)`

const USER_PROMPT_TEXT = (prompt) =>
  `Generate a professional diagram for the following description. Analyze the subject matter and choose appropriate node types, layout direction, and level of detail.

Description: ${prompt}`

const USER_PROMPT_MERMAID = (prompt) =>
  `Convert the following Mermaid diagram syntax into the JSON format. Preserve all nodes, edges, labels, and logical structure exactly as defined in the Mermaid source.

Mermaid syntax:
${prompt}`

export async function POST(request) {
  try {
    const { prompt, mode } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.POLLINATIONS_TEXT_API
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const userMessage = mode === 'mermaid'
      ? USER_PROMPT_MERMAID(prompt)
      : USER_PROMPT_TEXT(prompt)

    console.log('[AI Generate] Request:', { mode, promptLength: prompt.length })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    const response = await fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-fast',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI Generate] API error:', response.status, errorText)
      return NextResponse.json(
        { error: `AI service returned ${response.status}. Please try again.` },
        { status: 502 }
      )
    }

    const data = await response.json()
    console.log('[AI Generate] Raw API response:', JSON.stringify(data, null, 2))

    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.error('[AI Generate] No content in response:', data)
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    console.log('[AI Generate] Model output:', content)

    // Parse the JSON from the response (strip markdown fences if present)
    let diagram
    try {
      const cleaned = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      diagram = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[AI Generate] JSON parse failed. Raw content:', content)
      return NextResponse.json({ error: 'AI returned invalid format. Try again.' }, { status: 500 })
    }

    // Validate structure
    if (!diagram.nodes || !Array.isArray(diagram.nodes) || diagram.nodes.length === 0) {
      console.error('[AI Generate] Invalid diagram structure:', diagram)
      return NextResponse.json({ error: 'AI returned empty diagram. Try rephrasing.' }, { status: 500 })
    }

    console.log('[AI Generate] Success:', {
      title: diagram.title,
      nodes: diagram.nodes.length,
      edges: diagram.edges?.length || 0,
    })

    return NextResponse.json({ diagram })
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[AI Generate] Request timed out')
      return NextResponse.json({ error: 'AI request timed out. Try a simpler prompt.' }, { status: 504 })
    }
    console.error('[AI Generate] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
