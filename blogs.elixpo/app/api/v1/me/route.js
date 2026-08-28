export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { authorizeApiRequest } from '../../../../lib/api/v1/authorize';
import { apiError, apiSuccess, requestContext } from '../../../../lib/api/v1/responses';
import { recordApiAudit } from '../../../../lib/api/v1/operations';

export async function GET(request) {
  const context = requestContext();
  const authorized = await authorizeApiRequest(request, context, ['lixblogs:profile:read'], 'profile.get');
  if (authorized.response) return authorized.response;
  const { auth, db, rateHeaders } = authorized;

  try {
    const user = await db.prepare(`
      SELECT id, username, display_name, email, avatar_url
      FROM users WHERE id = ?
    `).bind(auth.userId).first();
    if (!user) {
      return apiError(context, 'account_not_provisioned', 'This profile is not available in LixBlogs.', 404, { headers: rateHeaders });
    }
    await recordApiAudit(db, {
      requestId: context.requestId,
      userId: auth.userId,
      clientId: auth.clientId,
      action: 'profile.get',
      resourceType: 'user',
      resourceId: auth.userId,
    });
    return apiSuccess(context, {
      id: user.id,
      username: user.username,
      displayName: user.display_name || user.username,
      email: user.email || null,
      avatarUrl: user.avatar_url || null,
    }, { headers: rateHeaders });
  } catch (error) {
    console.error('[api/v1/me] read failed:', error?.message || error);
    return apiError(context, 'internal_error', 'The profile could not be loaded.', 500, { headers: rateHeaders });
  }
}
