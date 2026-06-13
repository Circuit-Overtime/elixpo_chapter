import { readFileSync } from 'fs';
import path from 'path';
import { marked } from 'marked';
import MarkdownPage from '../../src/components/MarkdownPage';

export const metadata = {
  title: 'Privacy Policy — LixBlogs',
  description: 'How LixBlogs collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  const md = readFileSync(path.join(process.cwd(), 'content/privacy.md'), 'utf8');
  const html = marked.parse(md, { breaks: true });
  return <MarkdownPage html={html} />;
}
