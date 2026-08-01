'use client';

const H1 = 'text-[2.1rem] md:text-[2.4rem] font-extrabold tracking-tight text-white mb-4 leading-tight';
const LEDE = 'text-white/70 text-base md:text-[1.05rem] leading-relaxed mb-8';
const H2 = 'text-[1.4rem] font-bold text-white tracking-tight mt-12 mb-3';
const P = 'text-white/70 text-[0.96rem] leading-relaxed mb-4';
const PRE = 'p-4 rounded-xl text-[0.85rem] leading-relaxed overflow-x-auto mb-4 font-mono';
const PRE_STYLE = {
  background: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(0,0,0,0.08)',
  color: '#e8e8ed',
};
const METHOD_STYLE: Record<string, React.CSSProperties> = {
  POST: { background: 'rgba(229,57,53,0.18)', color: '#c62828', border: '1px solid rgba(229,57,53,0.4)' },
  GET: { background: 'rgba(95,182,255,0.18)', color: '#bcdcff', border: '1px solid rgba(95,182,255,0.4)' },
  PATCH: { background: 'rgba(251,191,36,0.18)', color: '#fde7a4', border: '1px solid rgba(251,191,36,0.4)' },
  DELETE: { background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' },
};

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase mr-2 font-mono"
      style={METHOD_STYLE[method]}
    >
      {method}
    </span>
  );
}

export default function ApiPage() {
  return (
    <article>
      <h1 className={H1}>Shortening API</h1>
      <p className={LEDE}>
        The four endpoints you need to create, list, update, and delete short
        links. Authenticate every request with an API key in the{' '}
        <code className="font-mono text-white">Authorization</code> header.
      </p>

      <h2 id="authentication" className={H2}>Authentication</h2>
      <pre className={PRE} style={PRE_STYLE}>
        <code>Authorization: Bearer elu_YOUR_API_KEY</code>
      </pre>

      <h2 id="create-a-short-link" className={H2}>
        <MethodBadge method="POST" />Create a short link
      </h2>
      <p className={P}>
        <code className="font-mono text-white">POST /api/urls</code>
      </p>
      <pre className={PRE} style={PRE_STYLE}>
        <code>{`curl -X POST https://lixrl.com/api/urls \\
  -H "Authorization: Bearer elu_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/long-url",
    "title": "My Link",
    "custom_code": "my-link"
  }'`}</code>
      </pre>
      <pre className={PRE} style={PRE_STYLE}>
        <code>{`{
  "short_url": "https://lixrl.com/my-link",
  "short_code": "my-link",
  "original_url": "https://example.com/long-url",
  "title": "My Link",
  "created_at": "2026-03-20T12:00:00Z"
}`}</code>
      </pre>

      <h2 id="list-your-links" className={H2}>
        <MethodBadge method="GET" />List your links
      </h2>
      <p className={P}>
        <code className="font-mono text-white">
          GET /api/urls?limit=20&amp;offset=0&amp;search=example
        </code>
      </p>
      <pre className={PRE} style={PRE_STYLE}>
        <code>{`curl https://lixrl.com/api/urls?limit=20&offset=0 \\
  -H "Authorization: Bearer elu_YOUR_KEY"`}</code>
      </pre>

      <h2 id="get-a-link" className={H2}>
        <MethodBadge method="GET" />Get a link
      </h2>
      <p className={P}>
        <code className="font-mono text-white">
          GET /api/urls/{'{code}'}
        </code>
      </p>
      <pre className={PRE} style={PRE_STYLE}>
        <code>{`curl https://lixrl.com/api/urls/my-link \\
  -H "Authorization: Bearer elu_YOUR_KEY"`}</code>
      </pre>

      <h2 id="update-a-link" className={H2}>
        <MethodBadge method="PATCH" />Update a link
      </h2>
      <p className={P}>
        <code className="font-mono text-white">
          PATCH /api/urls/{'{code}'}
        </code>{' '}
        — change destination URL, title, or active status.
      </p>
      <pre className={PRE} style={PRE_STYLE}>
        <code>{`curl -X PATCH https://lixrl.com/api/urls/my-link \\
  -H "Authorization: Bearer elu_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://new-destination.com", "is_active": true}'`}</code>
      </pre>

      <h2 id="delete-a-link" className={H2}>
        <MethodBadge method="DELETE" />Delete a link
      </h2>
      <p className={P}>
        <code className="font-mono text-white">
          DELETE /api/urls/{'{code}'}
        </code>{' '}
        — permanently removes the link and its analytics. This is
        irreversible.
      </p>
      <pre className={PRE} style={PRE_STYLE}>
        <code>{`curl -X DELETE https://lixrl.com/api/urls/my-link \\
  -H "Authorization: Bearer elu_YOUR_KEY"`}</code>
      </pre>
    </article>
  );
}
