export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { authorizeApiRequest } from '../../../../../lib/api/v1/authorize';
import { blogEntityTag } from '../../../../../lib/api/v1/entityTag';
import { recordApiAudit } from '../../../../../lib/api/v1/operations';
import { apiError, apiSuccess, requestContext } from '../../../../../lib/api/v1/responses';
import { decompressBlogContent } from '../../../../../lib/compress';
import { canEditBlog } from '../../../../../lib/permissions';

const READ_SCOPE = 'lixblogs:blog:read';

export async function GET(request, { params }) {
  const context = requestContext();
  const authorized = await authorizeApiRequest(request, context, [READ_SCOPE], 'blogs.get');
  if (authorized.response) return authorized.response;
  const { auth, db, rateHeaders } = authorized;
  const { id } = await params;
  if (!id || id.length > 128) {
    return apiError(context, 'invalid_blog_id', 'The blog ID is invalid.', 400, { headers: rateHeaders });
  }

  try {
    const blog = await db.prepare(`
      SELECT b.* FROM blogs b
      WHERE b.id = ? AND (
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
      LIMIT 1
    `).bind(id, auth.userId, auth.userId, auth.userId).first();

    if (!blog) {
      return apiError(context, 'blog_not_found', 'The blog was not found.', 404, { headers: rateHeaders });
    }

    const [tags, permission, etag] = await Promise.all([
      db.prepare('SELECT tag FROM blog_tags WHERE blog_id = ? ORDER BY tag').bind(blog.id).all(),
      canEditBlog(db, blog.id, auth.userId),
      blogEntityTag(blog),
    ]);
    let content = blog.content;
    try { content = decompressBlogContent(content); } catch {}

    await recordApiAudit(db, {
      requestId: context.requestId,
      userId: auth.userId,
      clientId: auth.clientId,
      action: 'blogs.get',
      resourceType: 'blog',
      resourceId: blog.id,
    });

    return apiSuccess(context, {
      id: blog.id,
      slug: blog.slug,
      title: blog.title || '',
      subtitle: blog.subtitle || '',
      content,
      tags: (tags?.results || []).map((row) => row.tag),
      status: blog.status,
      authorId: blog.author_id,
      publishedAs: blog.published_as,
      collectionId: blog.collection_id || null,
      emoji: blog.page_emoji || null,
      coverUrl: blog.cover_image_r2_key || null,
      coverPosition: { x: blog.cover_pos_x ?? 50, y: blog.cover_pos_y ?? 50 },
      coverZoom: blog.cover_zoom ?? 1,
      memberOnly: Boolean(blog.member_only),
      secret: Boolean(blog.secret),
      canEdit: Boolean(permission.ok),
      createdAt: blog.created_at,
      updatedAt: blog.updated_at,
      publishedAt: blog.published_at || null,
      etag,
    }, { headers: { ...rateHeaders, ETag: etag } });
  } catch (error) {
    console.error('[api/v1/blogs] get failed:', error?.message || error);
    return apiError(context, 'internal_error', 'The blog could not be loaded.', 500, { headers: rateHeaders });
  }
}
