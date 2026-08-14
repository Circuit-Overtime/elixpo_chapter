export const runtime = 'edge';

import { apiSuccess, requestContext } from '../../../lib/api/v1/responses';

export async function GET() {
  const context = requestContext();
  return apiSuccess(context, {
    name: 'LixBlogs API',
    version: '1.0.0',
    minCliVersion: '0.1.0',
    resourceOrigin: 'https://blogs.elixpo.com',
    authentication: {
      type: 'oauth2-bearer',
      issuer: 'https://accounts.elixpo.com',
      audience: 'blogs.elixpo.com',
    },
    resources: {
      blogs: '/api/v1/blogs',
      blog: '/api/v1/blogs/{id}',
      publish: '/api/v1/blogs/{id}/publish',
      unpublish: '/api/v1/blogs/{id}/unpublish',
      restore: '/api/v1/blogs/{id}/restore',
    },
  });
}
