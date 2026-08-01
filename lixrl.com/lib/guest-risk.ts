import { parseUserAgent } from './utils';

export interface GuestRiskIdentity {
  fingerprintHash: string;
  score: number;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Build a privacy-conscious abuse identity for the anonymous trial.
 *
 * The raw IP and request headers are used only in-memory. D1 receives a
 * secret-peppered SHA-256 digest plus a coarse risk score; neither the IP nor
 * the source metadata is persisted.
 */
export async function deriveGuestRiskIdentity(
  request: Request,
  secret: string,
): Promise<GuestRiskIdentity> {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '';
  const userAgent = request.headers.get('user-agent');
  const agent = parseUserAgent(userAgent);
  const language = (request.headers.get('accept-language') || '')
    .split(',')[0]
    .trim()
    .slice(0, 8)
    .toLowerCase();
  const fetchSite = request.headers.get('sec-fetch-site') || '';

  let score = 0;
  if (!ip) score += 45;
  if (!userAgent) score += 25;
  if (!language) score += 10;
  if (fetchSite === 'cross-site') score += 35;
  if (userAgent && /bot|crawler|spider|curl|wget|python|httpclient/i.test(userAgent)) {
    score += 30;
  }

  const material = [
    'guest-v1',
    secret,
    ip,
    agent.device,
    agent.browser,
    agent.os,
    language,
  ].join('|');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(material),
  );

  return { fingerprintHash: toHex(digest), score: Math.min(score, 100) };
}
