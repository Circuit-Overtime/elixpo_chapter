import { NextResponse } from 'next/server'
import {
  SYSTEM_PROMPT,
  USER_PROMPT_TEXT,
  USER_PROMPT_MERMAID,
  USER_PROMPT_EDIT,
} from '@/engine/core/ai-system-prompt.js'

const POLLINATIONS_URL = 'https://gen.pollinations.ai/v1/chat/completions'

export async function POST(request) {
  try {
    const { prompt, mode, history, previousDiagram } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.POLLINATIONS_TEXT_API
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Build the user message based on context
    let userMessage
    if (previousDiagram && previousDiagram.nodes) {
      // Edit mode — modify existing diagram
      userMessage = USER_PROMPT_EDIT(prompt, previousDiagram)
    } else if (mode === 'mermaid') {
      userMessage = USER_PROMPT_MERMAID(prompt)
    } else {
      userMessage = USER_PROMPT_TEXT(prompt)
    }

    console.log('[AI Generate] Request:', {
      mode,
      promptLength: prompt.length,
      isEdit: !!previousDiagram,
      historyLength: history?.length || 0,
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    // Build messages array with conversation history for context
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }]

    // Include relevant history for multi-turn edits
    if (history && Array.isArray(history) && history.length > 0) {
      // Only include the last few turns to keep context manageable
      const recentHistory = history.slice(-4)
      recentHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content })
        }
      })
    }

    messages.push({ role: 'user', content: userMessage })

    const response = await fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-fast',
        messages,
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
