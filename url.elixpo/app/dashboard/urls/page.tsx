import { getCurrentUser } from '@/lib/auth';
import { getDB } from '@/lib/db';
import type { UrlRecord } from '@/lib/types';
import Link from 'next/link';

export const runtime = 'edge';

export default async function UrlsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const { page: pageParam, search: searchParam } = await searchParams;
  const user = (await getCurrentUser())!;
  const db = getDB();
  const page = parseInt(pageParam || '1');
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = searchParam || '';

  let query = 'SELECT * FROM urls WHERE user_id = ?';
  const params: any[] = [user.id];
  if (search) {
    query += ' AND (short_code LIKE ? OR original_url LIKE ? OR title LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await db.prepare(query).bind(...params).all<UrlRecord>();
  const total = await db.prepare('SELECT COUNT(*) as count FROM urls WHERE user_id = ?')
    .bind(user.id).first<{ count: number }>();
  const totalPages = Math.ceil((total?.count || 0) / limit);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-display font-bold text-text-primary">My URLs</h1>
        <Link href="/dashboard/new" className="btn-lime no-underline">+ Shorten URL</Link>
      </div>

      <div className="glass-card p-6">
        <form method="get" className="mb-4">
          <input
            type="text"
            name="search"
            placeholder="Search URLs..."
            defaultValue={search}
            className="input-field max-w-xs"
          />
        </form>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Code</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Destination</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Title</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Clicks</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Status</th>
              <th className="text-left text-[0.7rem] text-text-disabled uppercase tracking-wider pb-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {results && results.length > 0 ? (
              results.map((u) => (
                <tr key={u.short_code} className="border-t border-border-light">
                  <td className="py-3">
                    <Link href={`/dashboard/urls/${u.short_code}`} className="text-lime-main text-sm no-underline hover:underline">
                      {u.short_code}
                    </Link>
                  </td>
                  <td className="py-3 text-sm text-text-secondary max-w-[250px] truncate">{u.original_url}</td>
                  <td className="py-3 text-sm text-text-muted">{u.title || '-'}</td>
                  <td className="py-3 text-sm">{u.clicks}</td>
                  <td className="py-3">
                    <span className={`badge ${u.is_active ? 'bg-[rgba(34,197,94,0.1)] text-[#4ade80] border border-[rgba(34,197,94,0.3)]' : 'bg-[rgba(239,68,68,0.1)] text-[#f87171] border border-[rgba(239,68,68,0.3)]'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-disabled text-sm italic">No URLs found</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {totalPages > 1 && (
          <div className="flex gap-2 justify-center mt-4">
            {page > 1 && (
              <Link href={`/dashboard/urls?page=${page - 1}&search=${search}`} className="btn-glass text-xs no-underline">Prev</Link>
            )}
            <span className="text-xs text-text-disabled px-3 py-1.5">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={`/dashboard/urls?page=${page + 1}&search=${search}`} className="btn-glass text-xs no-underline">Next</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
