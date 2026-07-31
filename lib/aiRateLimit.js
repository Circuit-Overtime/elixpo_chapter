// Shared auth + rate-limit enforcement for AI endpoints

import { getSession } from './auth';
import { getLimits } from './tiers';

/**
 * Validate session and enforce AI usage limits.
 * Returns { session, error } — if error is set, return it as the Response.
 */
export async function enforceAILimits({ requireMember = false } = {}) {
  const session = await getSession();
  if (!session?.userId) {
    return {
      session: null,
      error: new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 }),
    };
  }

  try {
    const { getDB } = await import('./cloudflare');
    const db = getDB();
    const user = await db.prepare('SELECT tier, ai_usage_today, ai_usage_date FROM users WHERE id = ?')
      .bind(session.userId).first();

    if (!user) {
      return {
        session,
        error: new Response(JSON.stringify({ error: 'User account not found' }), { status: 403 }),
      };
    }

    if (requireMember && user.tier !== 'member') {
      return {
        session,
        error: new Response(JSON.stringify({
          error: 'AI image generation requires the Member plan',
          upgrade: true,
        }), { status: 403 }),
      };
    }

    if (user) {
      const limits = getLimits(user.tier);
      const today = new Date().toISOString().slice(0, 10);
      const usageToday = user.ai_usage_date === today ? user.ai_usage_today : 0;

      if (usageToday >= limits.aiRequestsPerDay) {
        return {
          session,
          error: new Response(JSON.stringify({
            error: 'Daily AI limit reached',
            limit: limits.aiRequestsPerDay,
            tier: user.tier,
          }), { status: 429 }),
        };
      }

      await db.prepare('UPDATE users SET ai_usage_today = ?, ai_usage_date = ? WHERE id = ?')
        .bind(usageToday + 1, today, session.userId).run();
    }
  } catch (error) {
    if (requireMember) {
      console.error('[ai/rate-limit] membership check failed:', error);
      return {
        session,
        error: new Response(JSON.stringify({ error: 'AI access check unavailable' }), { status: 503 }),
      };
    }
    // D1 may not be available in local development for existing non-member AI routes.
  }

  return { session, error: null };
}
