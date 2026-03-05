export type EmailType =
  | 'otp'
  | 'password_reset'
  | 'signup_confirmation'
  | 'signin_notification'
  | 'api_key_created'
  | 'account_suspended'
  | 'admin_notification'
  | 'admin_digest';

export async function triggerEmail(
  type: EmailType,
  to: string,
  data: Record<string, unknown>
): Promise<void> {
  const secret = process.env.INTERNAL_API_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (!secret) {
    console.warn('[email-trigger] INTERNAL_API_SECRET not set, skipping email');
    return;
  }
  try {
    await fetch(`${baseUrl}/api/internal/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
      },
      body: JSON.stringify({ type, to, data }),
    });
  } catch (err) {
    console.error('[email-trigger] Failed to trigger email:', err);
  }
}
