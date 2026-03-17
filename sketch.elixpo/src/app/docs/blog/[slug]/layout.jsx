import { blogPosts } from '@/content/blog'

export const runtime = 'edge'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    return { title: 'Blog Post' }
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
      images: [{ url: '/Images/og-image.png', width: 1322, height: 612, alt: post.title }],
    },
    twitter: {
      title: post.title,
      description: post.description,
      images: ['/Images/og-image.png'],
    },
    alternates: { canonical: `/docs/blog/${slug}` },
  }
}

export default function BlogPostLayout({ children }) {
  return children
}
