import { readFileSync } from 'fs';
import path from 'path';
import { marked } from 'marked';
import DocsView from '../../src/components/DocsView';

export const metadata = {
  title: 'Docs',
  description: 'Developer API for the LixEditor package, npm, and the VS Code extension.',
};

export default function DocsIndex() {
  redirect('/docs/overview');
}
