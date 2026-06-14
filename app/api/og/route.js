import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// GitHub-style social cards on a clean white background.
//   type=blog    → LixBlogs mark + blog title + author list (small)
//   type=profile → avatar + name + owner/handle (orgs, users, collections, invites)
//
// Params: type, title, sub, subtitle, avatar, kind
//   sub      — authors line (blog) or owner/handle (profile)
//   subtitle — short description (optional)
//   kind     — small badge label (e.g. "Organization", "Collection", "Invitation")
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'blog';
  const title = (searchParams.get('title') || 'Untitled').slice(0, 120);
  const sub = (searchParams.get('sub') || '').slice(0, 120);
  const subtitle = (searchParams.get('subtitle') || '').slice(0, 200);
  const kind = (searchParams.get('kind') || '').slice(0, 40);

  // satori (next/og) can't decode WebP — our Cloudinary URLs default to f_webp.
  // Force JPEG delivery so avatars actually render.
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
  const hasAvatar = !!avatar;

  const WHITE = '#ffffff';
  const INK = '#0d1117';      // GitHub near-black
  const MUTED = '#57606a';    // GitHub muted text
  const BORDER = '#d0d7de';   // GitHub border
  const ACCENT = '#9b7bf7';   // LixBlogs purple

  // Brand mark — drawn inline (static assets don't render reliably in edge OG).
  const Brand = ({ size = 34, font = 24 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', width: `${size}px`, height: `${size}px`, borderRadius: '9px', background: `linear-gradient(135deg, ${ACCENT}, #6d4fd1)`, alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: `${font}px`, fontWeight: 800 }}>L</div>
      <span style={{ color: MUTED, fontSize: '26px', fontWeight: 700 }}>LixBlogs</span>
    </div>
  );

  const initial = (title || 'L').replace('@', '').charAt(0).toUpperCase();

  // ── Profile / org / collection / invite — avatar + name + owner ──
  if (type === 'profile') {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', background: WHITE, fontFamily: 'sans-serif', padding: '64px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', border: `1px solid ${BORDER}`, borderRadius: '24px', padding: '56px 64px', justifyContent: 'space-between' }}>
            <Brand />
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              {hasAvatar ? (
                <img src={avatar} width={200} height={200} style={{ width: '200px', height: '200px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${BORDER}` }} />
              ) : (
                <div style={{ display: 'flex', width: '200px', height: '200px', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${ACCENT}, #6d4fd1)`, color: '#fff', fontSize: '96px', fontWeight: 800 }}>
                  {initial}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                {kind ? <div style={{ display: 'flex', color: ACCENT, fontSize: '24px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>{kind}</div> : null}
                <div style={{ display: 'flex', color: INK, fontSize: title.length > 22 ? '56px' : '68px', fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
                {sub ? <div style={{ display: 'flex', color: MUTED, fontSize: '30px', fontWeight: 600, marginTop: '14px' }}>{sub}</div> : null}
                {subtitle ? <div style={{ display: 'flex', color: MUTED, fontSize: '24px', marginTop: '14px', lineHeight: 1.35, maxWidth: '720px' }}>{subtitle}</div> : null}
              </div>
            </div>
            <div style={{ display: 'flex' }} />
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  // ── Blog — mark + title + author list (small) ──
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: WHITE, fontFamily: 'sans-serif', padding: '64px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', border: `1px solid ${BORDER}`, borderRadius: '24px', padding: '56px 64px', justifyContent: 'space-between' }}>
          <Brand />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', color: INK, fontSize: title.length > 60 ? '60px' : '76px', fontWeight: 800, lineHeight: 1.08 }}>{title}</div>
            {subtitle ? <div style={{ display: 'flex', color: MUTED, fontSize: '30px', marginTop: '20px', lineHeight: 1.3, maxWidth: '960px' }}>{subtitle}</div> : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {hasAvatar ? (
              <img src={avatar} width={52} height={52} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${BORDER}` }} />
            ) : null}
            {sub ? <span style={{ display: 'flex', color: MUTED, fontSize: '28px', fontWeight: 600 }}>{sub}</span> : null}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
