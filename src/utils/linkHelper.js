export function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (/^(\/|#)/.test(trimmed) || /^(https?:|mailto:|tel:|sms:)/i.test(trimmed)) {
    return trimmed;
  }

  // Reject executable and unsupported explicit protocols instead of turning
  // them into clickable preview HTML.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return '';
  }

  return `https://${trimmed}`;
}

export function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
