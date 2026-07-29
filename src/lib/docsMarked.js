import { marked } from 'marked';
import { slugifyHeading } from './extractHeadings';

const renderer = new marked.Renderer();
renderer.heading = (token ,text, level) => {
  const id = slugifyHeading(token.text);
  return `<h${level} id="${id}">${text}</h${level}>`;
};
marked.use({ renderer });

export function renderDocsMarkdown(md) {
  return marked.parse(md, { breaks: true });
}
