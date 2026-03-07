export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getDatabase } from '@/lib/d1-client';
import { generateUUID } from '@/lib/webcrypto';
import { sendOTPEmail } from '@/lib/email';

function generateOTP(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const num = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * POST /api/auth/send-verification
 * Send a verification OTP to the authenticated user's email
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const db = await getDatabase();

    // Check if already verified
    const user = await db.prepare('SELECT email, email_verified FROM users WHERE id = ?').bind(payload.sub).first() as any;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.email_verified) return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });

    // Rate limit: max 1 email per 60 seconds
    const recent = await db.prepare(
      'SELECT created_at FROM email_verification_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(payload.sub).first() as any;

    if (recent?.created_at) {
      const lastSent = new Date(recent.created_at).getTime();
      const cooldown = 60 * 1000; // 60 seconds
      if (Date.now() - lastSent < cooldown) {
        const wait = Math.ceil((cooldown - (Date.now() - lastSent)) / 1000);
        return NextResponse.json({ error: `Please wait ${wait} seconds before requesting another code` }, { status: 429 });
      }
    }

    // Generate OTP and verification token
    const otp = generateOTP();
    const verificationToken = generateUUID();
    const expiryMinutes = parseInt(process.env.EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES || '10');
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    // Clean up old tokens for this user
    await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(payload.sub).run();

    // Store new token
    await db.prepare(
      'INSERT INTO email_verification_tokens (id, user_id, email, otp_code, verification_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(generateUUID(), payload.sub, user.email, otp, verificationToken, expiresAt).run();

    // Send OTP email
    const recipientName = user.email.split('@')[0];
    await sendOTPEmail(user.email, recipientName, otp);

    console.log(`[Verification] OTP sent to ${user.email}`);

    return NextResponse.json({
      message: 'Verification code sent to your email',
      expiresIn: expiryMinutes * 60,
    });
  } catch (error) {
    console.error('[Verification] Send error:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}
