import { readFileSync } from 'fs';
import path from 'path';
import { marked } from 'marked';
import DocsView from '../../src/components/DocsView';

export const metadata = {
  title: 'Docs — LixBlogs',
  description: 'Developer API for the LixEditor package, npm, and the VS Code extension.',
};

export default function DocsPage() {
  const md = readFileSync(path.join(process.cwd(), 'content/docs.md'), 'utf8');
  const html = marked.parse(md, { breaks: true });
  return <DocsView md={md} html={html} />;
}
