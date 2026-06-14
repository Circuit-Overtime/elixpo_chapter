import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Per-blog social card. Composes: blog banner (top), title + tagline, and a
// footer row with the author avatar + name + brand. Kept generic so WhatsApp /
// Twitter / Slack all render it the same way.
// /api/og?title=&subtitle=&author=&avatar=&cover=&emoji=
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') || 'Untitled').slice(0, 120);
  const subtitle = (searchParams.get('subtitle') || '').slice(0, 160);
  const author = (searchParams.get('author') || '').slice(0, 60);
  const emoji = (searchParams.get('emoji') || '').slice(0, 8);

  // satori (next/og) cannot decode WebP — our Cloudinary URLs default to f_webp.
  // Force a PNG/JPEG delivery so avatars and covers actually render.
  const ogSafeImage = (url) => {
    if (!url || !/^https?:\/\//.test(url)) return '';
    if (url.includes('res.cloudinary.com')) {
      let u = url.replace(/f_webp/g, 'f_jpg').replace(/f_auto/g, 'f_jpg');
      if (!/f_(jpg|png)/.test(u)) u = u.replace('/upload/', '/upload/f_jpg/');
      return u;
    }
    return url;
  };

  const avatar = ogSafeImage(searchParams.get('avatar') || '');
  const cover = ogSafeImage(searchParams.get('cover') || '');
  const hasCover = !!cover;
  const hasAvatar = !!avatar;
  const type = searchParams.get('type') || 'blog';

  // ── Profile card: real logo + big avatar + a hue derived from the handle ──
  if (type === 'profile') {
    // Deterministic hue from the handle so the tint feels matched to the user.
    let h = 0;
    for (let i = 0; i < author.length; i++) h = (h * 31 + author.charCodeAt(i)) % 360;
    const accent = `hsl(${h}, 62%, 58%)`;
    const accentDeep = `hsl(${h}, 55%, 28%)`;
    const initial = (title || author || 'L').replace('@', '').charAt(0).toUpperCase();

    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, #0f1117 0%, ${accentDeep} 100%)`, fontFamily: 'sans-serif', position: 'relative' }}>
          {/* Brand row, top-left. Drawn inline — same-origin static assets don't
              reliably render inside the edge OG runtime, so we don't <img> the logo. */}
          <div style={{ position: 'absolute', top: 48, left: 56, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg, #9b7bf7, #6d4fd1)', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 800 }}>L</div>
            <span style={{ color: '#e8e8ee', fontSize: '26px', fontWeight: 700 }}>LixBlogs</span>
          </div>

          {/* Avatar */}
          {hasAvatar ? (
            <img src={avatar} width={180} height={180} style={{ width: '180px', height: '180px', borderRadius: '50%', objectFit: 'cover', border: `6px solid ${accent}` }} />
          ) : (
            <div style={{ display: 'flex', width: '180px', height: '180px', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', background: accent, color: '#fff', fontSize: '84px', fontWeight: 800, border: '6px solid rgba(255,255,255,0.15)' }}>
              {initial}
            </div>
          )}

          {/* Name + handle + bio */}
          <div style={{ display: 'flex', color: '#f4f4f6', fontSize: '54px', fontWeight: 800, marginTop: '28px' }}>{title}</div>
          {author ? <div style={{ display: 'flex', color: accent, fontSize: '28px', fontWeight: 600, marginTop: '6px' }}>{author}</div> : null}
          {subtitle ? (
            <div style={{ display: 'flex', color: '#aab0bd', fontSize: '26px', marginTop: '16px', maxWidth: '820px', textAlign: 'center', lineHeight: 1.3 }}>{subtitle}</div>
          ) : null}
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0f1117', fontFamily: 'sans-serif' }}>
        {/* Banner band */}
        <div style={{ display: 'flex', width: '100%', height: '300px', overflow: 'hidden' }}>
          {hasCover ? (
            <img src={cover} width={1200} height={300} style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', width: '100%', height: '300px', background: 'linear-gradient(135deg, #9b7bf7 0%, #6d4fd1 100%)' }} />
          )}
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '40px 72px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {emoji ? <div style={{ fontSize: '52px' }}>{emoji}</div> : null}
            <div style={{ display: 'flex', color: '#f4f4f6', fontSize: title.length > 60 ? '50px' : '62px', fontWeight: 800, lineHeight: 1.08 }}>
              {title}
            </div>
            {subtitle ? (
              <div style={{ display: 'flex', color: '#9aa0ad', fontSize: '28px', lineHeight: 1.3 }}>{subtitle}</div>
            ) : null}
          </div>

          {/* Footer: author avatar + name, brand on the right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {hasAvatar ? (
                <img src={avatar} width={56} height={56} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', width: '56px', height: '56px', borderRadius: '50%', background: '#9b7bf7', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '26px', fontWeight: 800 }}>
                  {(author || 'L').charAt(0).toUpperCase()}
                </div>
              )}
              {author ? <span style={{ color: '#c4c8d2', fontSize: '28px', fontWeight: 600 }}>{author}</span> : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg, #9b7bf7, #6d4fd1)', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 800 }}>L</div>
              <span style={{ color: '#9aa0ad', fontSize: '24px', fontWeight: 600 }}>LixBlogs</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
