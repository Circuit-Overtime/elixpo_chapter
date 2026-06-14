import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const src = resolve('src');
const dist = resolve('dist');

// Copy raw CSS files preserving directory structure (so granular subpath
// imports like `@elixpo/lixeditor/styles/editor.css` keep working).
function copyCSSRecursive(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    if (statSync(srcPath).isDirectory()) {
      copyCSSRecursive(srcPath, destPath);
    } else if (entry.endsWith('.css')) {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Build ESM
await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/index.js',
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  target: 'es2020',
  platform: 'browser',
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@blocknote/core',
    '@blocknote/react',
    '@blocknote/mantine',
    'katex',
    'mermaid',
    'shiki',
  ],
  minify: false,
  sourcemap: true,
  treeShaking: true,
  banner: { js: '"use client";' },
});

// Build CJS
await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'cjs',
  outfile: 'dist/index.cjs',
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  target: 'es2020',
  platform: 'browser',
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@blocknote/core',
    '@blocknote/react',
    '@blocknote/mantine',
    'katex',
    'mermaid',
    'shiki',
  ],
  minify: false,
  sourcemap: true,
  treeShaking: true,
});

// Copy raw CSS (preserves per-file structure for advanced consumers).
copyCSSRecursive(join(src, 'styles'), join(dist, 'styles'));

// Bundle all styles into a single self-contained file so a plain
// `import '@elixpo/lixeditor/styles'` works without a CSS-aware resolver
// chasing @import chains.
await build({
  entryPoints: [join(src, 'styles', 'index.css')],
  bundle: true,
  outfile: join(dist, 'styles', 'index.css'),
  allowOverwrite: true,
  loader: { '.css': 'css', '.woff': 'file', '.woff2': 'file', '.ttf': 'file', '.eot': 'file', '.svg': 'file', '.png': 'file' },
  minify: false,
});

console.log('✓ Built ESM, CJS, and bundled CSS to dist/');
