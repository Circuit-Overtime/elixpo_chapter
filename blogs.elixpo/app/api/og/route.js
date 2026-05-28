import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Dynamic OG card for blogs without a cover image (GitHub-style auto card).
// /api/og?title=...&author=...&emoji=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') || 'Untitled').slice(0, 120);
  const author = (searchParams.get('author') || '').slice(0, 60);
  const emoji = (searchParams.get('emoji') || '').slice(0, 8);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #0f1117 0%, #1a1d29 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* top brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#9b7bf7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              color: '#fff',
              fontWeight: 800,
            }}
          >
            L
          </div>
          <span style={{ color: '#9aa0ad', fontSize: '26px', fontWeight: 600 }}>LixBlogs</span>
        </div>

        {/* title block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {emoji ? <div style={{ fontSize: '64px' }}>{emoji}</div> : null}
          <div
            style={{
              color: '#f4f4f6',
              fontSize: title.length > 60 ? '60px' : '76px',
              fontWeight: 800,
              lineHeight: 1.1,
              display: 'flex',
            }}
          >
            {title}
          </div>
        </div>

        {/* author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '6px', borderRadius: '3px', background: '#9b7bf7' }} />
          <span style={{ color: '#c4c8d2', fontSize: '30px', fontWeight: 600 }}>
            {author ? `by ${author}` : 'Read on blogs.elixpo.com'}
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
