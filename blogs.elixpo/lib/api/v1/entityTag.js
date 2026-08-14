function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function blogEntityTag(blog) {
  const stable = JSON.stringify([
    blog.id,
    blog.slug,
    blog.status,
    blog.updated_at,
    blog.title,
    blog.subtitle,
    blog.content,
    blog.cover_image_r2_key,
    blog.page_emoji,
    blog.published_as,
    blog.collection_id,
    blog.secret,
    blog.member_only,
  ]);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable)));
  return `"${bytesToBase64Url(digest)}"`;
}
