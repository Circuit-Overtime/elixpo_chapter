export function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  if (/^(https?:\/\/|\/|#|mailto:|tel:|sms:|javascript:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
