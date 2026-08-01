export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { getCloudinaryUrl } from '../../../lib/cloudinary';

export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { getDB } = await import('../../../lib/cloudflare');
  const db = getDB();
  const { results = [] } = await db.prepare(`
    SELECT m.id, m.size_bytes, m.media_type, m.created_at, m.cloudinary_public_id,
      b.id AS blog_id, b.title AS blog_title, b.published_as, b.collection_id,
      c.name AS collection_name, o.id AS org_id, o.name AS org_name
    FROM media_uploads m
    LEFT JOIN blogs b ON b.id = m.blog_id
    LEFT JOIN collections c ON c.id = b.collection_id
    LEFT JOIN orgs o ON b.published_as = ('org:' || o.id)
    WHERE m.user_id = ?
    ORDER BY m.created_at DESC
    LIMIT 200
  `).bind(session.userId).all();

  const items = results.map((item) => ({ ...item, url: getCloudinaryUrl(item.cloudinary_public_id) }));
  const total = await db.prepare('SELECT COALESCE(SUM(size_bytes), 0) AS bytes, COUNT(*) AS count FROM media_uploads WHERE user_id = ?')
    .bind(session.userId).first();
  const aggregate = async (join, id, name) => {
    const { results: rows = [] } = await db.prepare(`
      SELECT ${id} AS id, ${name} AS name, SUM(m.size_bytes) AS bytes, COUNT(*) AS count
      FROM media_uploads m
      JOIN blogs b ON b.id = m.blog_id
      ${join}
      WHERE m.user_id = ? AND ${id} IS NOT NULL
      GROUP BY ${id}, ${name}
      ORDER BY bytes DESC
      LIMIT 100
    `).bind(session.userId).all();
    return rows;
  };
  const organisations = await aggregate("JOIN orgs o ON b.published_as = ('org:' || o.id)", 'o.id', 'o.name');
  const collections = await aggregate('JOIN collections c ON c.id = b.collection_id', 'c.id', 'c.name');

  return NextResponse.json({
    totalBytes: Number(total?.bytes || 0),
    count: Number(total?.count || 0),
    organisations,
    collections,
    items,
  });
}
