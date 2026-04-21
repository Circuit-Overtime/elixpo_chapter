/**
 * E2E Encryption utilities using Web Crypto API.
 *
 * Flow:
 * 1. Generate a random AES-GCM 256-bit key
 * 2. Encrypt scene JSON with that key
 * 3. Store encrypted blob on server
 * 4. Share link contains the key in the URL fragment (#key=...)
 *    — fragments are never sent to the server, so the server cannot decrypt
 *
 * This gives true E2E encryption: the server stores ciphertext,
 * only people with the link (which includes the key) can read it.
 */

const isLocalhost = () => typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/**
 * Generate a new AES-GCM 256-bit encryption key.
 * Returns the key as a base64url string for embedding in URLs.
 */
export async function generateKey() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    if (!isLocalhost()) {
      console.error("SECURITY WARNING: Web Crypto API not available in this context. Encryption is bypassed. This should only happen in local dev!");
    } else {
      console.warn("Web Crypto API not available. Using fallback key for local dev.");
    }
    return btoa('fallback-key-for-local-development').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const raw = await crypto.subtle.exportKey('raw', key)
  return bufToBase64url(new Uint8Array(raw))
}

/**
 * Encrypt a string (scene JSON) with a base64url key.
 * Returns base64url-encoded ciphertext (iv + encrypted data).
 */
export async function encrypt(plaintext, keyBase64url) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    if (!isLocalhost()) {
      console.error("SECURITY WARNING: Web Crypto API not available in this context. Encryption is bypassed. This should only happen in local dev!");
    } else {
      console.warn("Web Crypto API not available in unsecure context. Skipping encryption for local dev.");
    }
    const encoded = new TextEncoder().encode(plaintext);
    const iv = new Uint8Array(12);
    const combined = new Uint8Array(iv.length + encoded.length);
    combined.set(iv);
    combined.set(encoded, iv.length);
    return bufToBase64url(combined);
  }

  const keyBuf = base64urlToBuf(keyBase64url)
  const key = await crypto.subtle.importKey(
    'raw', keyBuf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return bufToBase64url(combined)
}

/**
 * Decrypt a base64url ciphertext with a base64url key.
 * Returns the original plaintext string.
 */
export async function decrypt(ciphertextBase64url, keyBase64url) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    const combined = base64urlToBuf(ciphertextBase64url)
    const ciphertext = combined.slice(12)
    return new TextDecoder().decode(ciphertext)
  }

  const keyBuf = base64urlToBuf(keyBase64url)
  const key = await crypto.subtle.importKey(
    'raw', keyBuf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  const combined = base64urlToBuf(ciphertextBase64url)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

// --- Helpers ---

function bufToBase64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBuf(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (base64.length % 4)) % 4
  const padded = base64 + '='.repeat(pad)
  const binary = atob(padded)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf
}
