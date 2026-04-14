/**
 * Paper session — stores tex content + metadata in sessionStorage
 * so it survives navigation to /paper/[slug] without re-uploading.
 *
 * Flow:
 *   1. Home page: user pastes or uploads .tex
 *   2. createPaperSession() stores content, returns slug
 *   3. Router navigates to /paper/[slug]
 *   4. Paper page calls getPaperSession(slug) to load content
 */

export interface PaperSession {
  slug: string;
  tex: string;
  filename: string | null;
  domain: string;
  createdAt: number;
}

export function createPaperSession(tex: string, filename: string | null, domain: string): string {
  const slug = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const session: PaperSession = {
    slug,
    tex,
    filename,
    domain,
    createdAt: Date.now(),
  };
  sessionStorage.setItem(`paper:${slug}`, JSON.stringify(session));
  return slug;
}

export function getPaperSession(slug: string): PaperSession | null {
  const raw = sessionStorage.getItem(`paper:${slug}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function updatePaperSession(slug: string, updates: Partial<PaperSession>) {
  const existing = getPaperSession(slug);
  if (!existing) return;
  sessionStorage.setItem(`paper:${slug}`, JSON.stringify({ ...existing, ...updates }));
}

export function getAllPaperSessions(): PaperSession[] {
  if (typeof window === "undefined") return [];
  const sessions: PaperSession[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith("paper:")) {
      try {
        const data = JSON.parse(sessionStorage.getItem(key)!);
        sessions.push(data);
      } catch {}
    }
  }
  return sessions.sort((a, b) => b.createdAt - a.createdAt);
}

export function deletePaperSession(slug: string) {
  sessionStorage.removeItem(`paper:${slug}`);
}
