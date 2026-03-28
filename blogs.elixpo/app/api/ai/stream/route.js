// Server-side proxy for Pollinations AI streaming
// Keeps API key server-side, streams SSE to client

import { getSession } from '../../../../lib/auth';
import { getLimits } from '../../../../lib/tiers';

const POLLINATIONS_BASE = 'https://gen.pollinations.ai/v1';

export async function POST(request) {
  const apiKey = process.env.POLLINATIONS_TEXT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500 });
  }

  // Enforce AI usage tier limits
  const session = await getSession();
  if (!session?.userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  let db;
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    db = getDB();
    const user = await db.prepare('SELECT tier, ai_usage_today, ai_usage_date FROM users WHERE id = ?')
      .bind(session.userId).first();

    if (user) {
      const limits = getLimits(user.tier);
      const today = new Date().toISOString().slice(0, 10);
      const usageToday = user.ai_usage_date === today ? user.ai_usage_today : 0;

      if (usageToday >= limits.aiRequestsPerDay) {
        return new Response(JSON.stringify({
          error: 'Daily AI limit reached',
          limit: limits.aiRequestsPerDay,
          tier: user.tier,
        }), { status: 429 });
      }

      // Increment usage
      await db.prepare(`
        UPDATE users SET ai_usage_today = ?, ai_usage_date = ? WHERE id = ?
      `).bind(usageToday + 1, today, session.userId).run();
    }
  } catch {
    // D1 not available (local dev) — skip enforcement
  }

  const body = await request.json();
  const { systemPrompt, userPrompt, model = 'openai', temperature = 0.7 } = body;

  if (!userPrompt) {
    return new Response(JSON.stringify({ error: 'Missing userPrompt' }), { status: 400 });
  }

  const aiRes = await fetch(`${POLLINATIONS_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt },
      ],
      temperature,
      stream: true,
    }),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    return new Response(JSON.stringify({ error: `AI error: ${err}` }), { status: aiRes.status });
  }

  // Pass through the SSE stream directly
  return new Response(aiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
