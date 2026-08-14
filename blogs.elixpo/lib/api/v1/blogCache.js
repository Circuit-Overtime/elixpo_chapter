export async function invalidateBlogLifecycleCaches(blogId) {
  try {
    const { kvInvalidate } = await import('../../cache');
    await kvInvalidate(
      'v1:tags:popular:30',
      'v1:tags:popular:12',
      'v1:trending:3',
      'v1:trending:5',
      'v1:trending:10',
      'v1:feed:anon:trending:p1',
      `v1:interactions:${blogId}`,
    );
  } catch (error) {
    console.error('[api/v1/blogs] cache invalidation failed:', error?.message || error);
  }
}
