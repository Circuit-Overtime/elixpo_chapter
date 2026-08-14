export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { authorizeApiRequest } from '../../../../lib/api/v1/authorize';
import { encodeCursor, parsePage } from '../../../../lib/api/v1/pagination';
import { apiError, apiSuccess, requestContext } from '../../../../lib/api/v1/responses';
import { recordApiAudit } from '../../../../lib/api/v1/operations';

const LIST_SCOPE = 'lixblogs:blog:read';
const ALLOWED_STATUSES = new Set(['all', 'draft', 'published']);

function serializeBlog(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || '',
    subtitle: row.subtitle || '',
    status: row.status,
    authorId: row.author_id,
    publishedAs: row.published_as,
    collectionId: row.collection_id || null,
    emoji: row.page_emoji || null,
    coverUrl: row.cover_image_r2_key || null,
    memberOnly: Boolean(row.member_only),
    secret: Boolean(row.secret),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || null,
  };
}

export async function GET(request) {
  const context = requestContext();
  const authorized = await authorizeApiRequest(request, context, [LIST_SCOPE], 'blogs.list');
  if (authorized.response) return authorized.response;
  const { auth, db, rateHeaders } = authorized;

  const searchParams = new URL(request.url).searchParams;
  const status = searchParams.get('status') || 'all';
  if (!ALLOWED_STATUSES.has(status)) {
    return apiError(context, 'invalid_status', 'status must be all, draft, or published.', 400, { headers: rateHeaders });
  }

  let page;
  try {
    page = parsePage(searchParams);
  } catch (error) {
    const code = error.message === 'invalid_limit' ? 'invalid_limit' : 'invalid_cursor';
    return apiError(context, code, 'The pagination parameters are invalid.', 400, { headers: rateHeaders });
  }

  const filters = [];
  const bindings = [auth.userId, auth.userId, auth.userId];
  if (status !== 'all') {
    filters.push('b.status = ?');
    bindings.push(status);
  }
  if (page.cursor) {
    filters.push('(b.updated_at < ? OR (b.updated_at = ? AND b.id < ?))');
    bindings.push(page.cursor.updatedAt, page.cursor.updatedAt, page.cursor.id);
  }
  bindings.push(page.limit + 1);

  try {
    const rows = await db.prepare(`
      SELECT b.id, b.slug, b.title, b.subtitle, b.status, b.author_id,
        b.published_as, b.collection_id, b.page_emoji, b.cover_image_r2_key,
        b.member_only, b.secret, b.created_at, b.updated_at, b.published_at
      FROM blogs b
      WHERE (
        b.author_id = ?
        OR EXISTS (
          SELECT 1 FROM blog_co_authors c
          WHERE c.blog_id = b.id AND c.user_id = ? AND c.status = 'accepted'
        )
        OR (
          b.published_as LIKE 'org:%'
          AND EXISTS (
            SELECT 1 FROM org_members m
            WHERE m.org_id = substr(b.published_as, 5) AND m.user_id = ?
          )
        )
      )
      ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
      ORDER BY b.updated_at DESC, b.id DESC
      LIMIT ?
    `).bind(...bindings).all();

    const results = rows?.results || [];
    const hasMore = results.length > page.limit;
    const visible = hasMore ? results.slice(0, page.limit) : results;
    const nextCursor = hasMore && visible.length ? encodeCursor(visible[visible.length - 1]) : null;

    await recordApiAudit(db, {
      requestId: context.requestId,
      userId: auth.userId,
      clientId: auth.clientId,
      action: 'blogs.list',
      resourceType: 'blog',
    });

    return apiSuccess(context, visible.map(serializeBlog), {
      meta: { limit: page.limit, hasMore, nextCursor },
      headers: rateHeaders,
    });
  } catch (error) {
    console.error('[api/v1/blogs] list failed:', error?.message || error);
    return apiError(context, 'internal_error', 'Blogs could not be listed.', 500, { headers: rateHeaders });
  }
}
