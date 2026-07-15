import { readFileSync } from 'fs';
import path from 'path';
import { marked } from 'marked';
import DocsView from '../../../src/components/DocsView';

export const metadata = {
  title: 'Search syntax',
  description:
    'Search LixBlogs with GitHub-style qualifiers. Filter by tag, author, organization, date and status, sort results, use quoted phrases, and exclude terms with a leading minus.',
  alternates: { canonical: 'https://blogs.elixpo.com/docs/search' },
};

// Same pattern as /docs: markdown lives in content/, rendered at build time.
export default function SearchDocsPage() {
  const md = readFileSync(path.join(process.cwd(), 'content/search-syntax.md'), 'utf8');
  const html = marked.parse(md, { breaks: true });
  return <DocsView md={md} html={html} />;
}
