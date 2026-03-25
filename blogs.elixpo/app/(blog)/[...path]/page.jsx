export const dynamic = 'force-dynamic';

import BlogReader from './BlogReader';

export default function BlogPage({ params }) {
  return <BlogReader params={params} />;
}
