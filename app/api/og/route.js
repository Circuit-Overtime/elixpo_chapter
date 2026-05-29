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
  const avatar = searchParams.get('avatar') || '';
  const cover = searchParams.get('cover') || '';
  const emoji = (searchParams.get('emoji') || '').slice(0, 8);

  const hasCover = /^https?:\/\//.test(cover);
  const hasAvatar = /^https?:\/\//.test(avatar);

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
              <div style={{ display: 'flex', width: '34px', height: '34px', borderRadius: '9px', background: '#9b7bf7', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 800 }}>L</div>
              <span style={{ color: '#9aa0ad', fontSize: '24px', fontWeight: 600 }}>LixBlogs</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
