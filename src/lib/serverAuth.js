const ELIXPO_AUTH_URL = 'https://accounts.elixpo.com'

function readAuthCookie(request) {
  try {
    const raw = request.cookies.get('lixsketch-session')?.value
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return JSON.parse(decodeURIComponent(raw))
    }
  } catch {
    return null
  }
}

export async function getAuthenticatedUser(request) {
  const saved = readAuthCookie(request)
  if (!saved?.sessionToken) return null
  try {
    const response = await fetch(`${ELIXPO_AUTH_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${saved.sessionToken}` },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const profile = await response.json()
    const id = profile.id || profile.userId
    if (!id) return null
    return {
      id,
      email: profile.email || saved.user?.email || null,
      displayName: profile.displayName || saved.user?.displayName || null,
    }
  } catch {
    return null
  }
}
