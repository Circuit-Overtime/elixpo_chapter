import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// GitHub-style social cards on a clean white background.
//   type=profile → real logo + avatar + name + @handle + bio (users & orgs)
//   type=blog    → real logo + blog banner + title + tagline + read time · authors
//
// Params: type, title, subtitle, sub, kind, avatar, cover, readTime
//   subtitle — bio (profile) or tagline (blog)
//   sub      — @handle (profile) or author list (blog)
//   kind     — small badge ("Author Profile", "Organisation", "Collection", …)
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const type = searchParams.get('type') || 'blog';
  const title = (searchParams.get('title') || 'Untitled').slice(0, 120);
  const subtitle = (searchParams.get('subtitle') || '').slice(0, 220);
  const sub = (searchParams.get('sub') || '').slice(0, 140);
  const kind = (searchParams.get('kind') || '').slice(0, 40);
  const readTime = (searchParams.get('readTime') || '').slice(0, 20);

  // satori can't decode WebP — force Cloudinary to deliver JPEG.
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
  const hasAvatar = !!avatar;
  const hasCover = !!cover;

  // Embed the real LixBlogs logo (public/logo-dark.png — dark mark on white) as a
  // data URI so it renders reliably inside the edge OG runtime.
  let logoSrc = '';
  try {
    const r = await fetch(`${origin}/logo-dark.png`);
    if (r.ok) {
      const bytes = new Uint8Array(await r.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      logoSrc = `data:image/png;base64,${btoa(binary)}`;
    }
  } catch { /* fall back to the drawn mark */ }

  const INK = '#0d1117';
  const MUTED = '#57606a';
  const BORDER = '#d0d7de';
  const ACCENT = '#9b7bf7';

  const Brand = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {logoSrc
        ? <img src={logoSrc} width={36} height={36} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
        : <div style={{ display: 'flex', width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${ACCENT}, #6d4fd1)`, alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '22px', fontWeight: 800 }}>L</div>}
      <span style={{ color: INK, fontSize: '28px', fontWeight: 700 }}>LixBlogs</span>
    </div>
  );

  const initial = (title || 'L').replace('@', '').charAt(0).toUpperCase();

  // ── Profile / org / collection — logo + avatar + name + handle + bio ──
  if (type === 'profile') {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', background: '#ffffff', fontFamily: 'sans-serif', padding: '72px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', border: `1px solid ${BORDER}`, borderRadius: '28px', padding: '60px 68px', justifyContent: 'space-between' }}>
            <Brand />
            <div style={{ display: 'flex', alignItems: 'center', gap: '44px' }}>
              {hasAvatar ? (
                <img src={avatar} width={210} height={210} style={{ width: '210px', height: '210px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${BORDER}` }} />
              ) : (
                <div style={{ display: 'flex', width: '210px', height: '210px', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${ACCENT}, #6d4fd1)`, color: '#fff', fontSize: '100px', fontWeight: 800 }}>{initial}</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                {kind ? <div style={{ display: 'flex', color: ACCENT, fontSize: '22px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>{kind}</div> : null}
                <div style={{ display: 'flex', color: INK, fontSize: title.length > 22 ? '54px' : '66px', fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
                {sub ? <div style={{ display: 'flex', color: MUTED, fontSize: '28px', fontWeight: 600, marginTop: '12px' }}>{sub}</div> : null}
                {subtitle ? <div style={{ display: 'flex', color: MUTED, fontSize: '24px', marginTop: '16px', lineHeight: 1.4, maxWidth: '700px' }}>{subtitle}</div> : null}
              </div>
            </div>
            <div style={{ display: 'flex' }} />
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  // ── Blog — logo + banner + title + tagline + read time · authors ──
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#ffffff', fontFamily: 'sans-serif', padding: '64px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', border: `1px solid ${BORDER}`, borderRadius: '28px', overflow: 'hidden' }}>
          {/* Banner — cover if present, else a branded default */}
          <div style={{ display: 'flex', width: '100%', height: '230px' }}>
            {hasCover
              ? <img src={cover} width={1072} height={230} style={{ width: '100%', height: '230px', objectFit: 'cover' }} />
              : <div style={{ display: 'flex', width: '100%', height: '230px', background: `linear-gradient(135deg, ${ACCENT} 0%, #6d4fd1 100%)` }} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '40px 56px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', color: INK, fontSize: title.length > 52 ? '52px' : '64px', fontWeight: 800, lineHeight: 1.08 }}>{title}</div>
              {subtitle ? <div style={{ display: 'flex', color: MUTED, fontSize: '28px', marginTop: '16px', lineHeight: 1.3, maxWidth: '960px' }}>{subtitle}</div> : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: MUTED, fontSize: '24px', fontWeight: 600 }}>
                {hasAvatar ? <img src={avatar} width={44} height={44} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${BORDER}` }} /> : null}
                <span style={{ display: 'flex' }}>{[readTime, sub].filter(Boolean).join('  ·  ')}</span>
              </div>
              <Brand />
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
