'use client';

const H1 = 'text-[2.1rem] md:text-[2.4rem] font-extrabold tracking-tight text-white mb-4 leading-tight';
const LEDE = 'text-white/70 text-base md:text-[1.05rem] leading-relaxed mb-8';
const H2 = 'text-[1.4rem] font-bold text-white tracking-tight mt-12 mb-3';
const P = 'text-white/70 text-[0.96rem] leading-relaxed mb-4';
const PRE = 'p-4 rounded-xl text-[0.85rem] leading-relaxed overflow-x-auto mb-6 font-mono';
const PRE_STYLE = {
  background: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(0,0,0,0.08)',
  color: '#e8e8ed',
};

const ERRORS: Array<[string, number, string]> = [
  ['unauthorized', 401, 'Missing or invalid API key.'],
  ['forbidden', 403, 'Key exists but doesn\'t own this resource.'],
  ['not_found', 404, 'No short link with that code.'],
  ['slug_taken', 409, 'The custom_code you asked for is already in use.'],
  ['invalid_url', 422, 'The destination URL did not parse.'],
  ['rate_limited', 429, 'You hit your tier\'s quota — back off and retry.'],
  ['server_error', 500, 'Something broke on our side. Retry with exponential backoff.'],
];

export default function ErrorsPage() {
  return (
    <article>
      <h1 className={H1}>Error Reference</h1>
      <p className={LEDE}>
        Every error response is JSON with a stable error code and a
        human-readable message. The HTTP status mirrors the category.
      </p>

      <h2 id="format" className={H2}>Format</h2>
      <pre className={PRE} style={PRE_STYLE}>
        <code>{`{
  "error":   "slug_taken",
  "message": "The slug 'launch' is already in use"
}`}</code>
      </pre>

      <h2 id="codes" className={H2}>Codes</h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(0,0,0,0.10)' }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(0,0,0,0.05)' }}>
            <tr className="text-white/70">
              <th className="text-left px-4 py-2 font-semibold">code</th>
              <th className="text-left px-4 py-2 font-semibold">HTTP</th>
              <th className="text-left px-4 py-2 font-semibold">meaning</th>
            </tr>
          </thead>
          <tbody>
            {ERRORS.map(([code, status, msg]) => (
              <tr
                key={code}
                className="text-white/80"
                style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
              >
                <td className="px-4 py-2 font-mono text-white">{code}</td>
                <td className="px-4 py-2 font-mono">{status}</td>
                <td className="px-4 py-2 text-white/70">{msg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="retrying" className={H2}>Retrying</h2>
      <p className={P}>
        4xx errors are deterministic — fix the request and retry. For
        <code className="font-mono text-white"> rate_limited</code> the
        response includes a <code className="font-mono text-white">Retry-After</code>{' '}
        header in seconds. For 5xx, retry with exponential backoff
        (250ms · 500ms · 1s · 2s · 4s, max 5 tries).
      </p>
    </article>
  );
}
