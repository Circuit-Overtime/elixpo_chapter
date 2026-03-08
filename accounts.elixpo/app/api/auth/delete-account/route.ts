export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getDatabase } from '@/lib/d1-client';

/**
 * POST /api/auth/delete-account
 * Permanently delete the authenticated user's account and all associated data
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = payload.sub;
    const db = await getDatabase();

    // Delete in order: dependent tables first, then user
    await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(userId).run();
    await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(userId).run();
    await db.prepare('DELETE FROM identities WHERE user_id = ?').bind(userId).run();
    await db.prepare('DELETE FROM audit_logs WHERE user_id = ?').bind(userId).run();
    // Deactivate OAuth apps owned by this user
    await db.prepare('UPDATE oauth_clients SET is_active = 0 WHERE owner_id = ?').bind(userId).run();
    // Delete the user
    await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    console.log(`[Account] Deleted user: ${userId}`);

    // Clear auth cookies
    const response = NextResponse.json({ message: 'Account deleted successfully' });
    response.cookies.set('access_token', '', { maxAge: 0, path: '/' });
    response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    console.error('[Account] Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
