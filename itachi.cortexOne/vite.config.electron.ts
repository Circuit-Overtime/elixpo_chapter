import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    minify: false,
    outDir: 'dist-electron',
    lib: {
      entry: {
        main: resolve(__dirname, 'electron/main.ts'),
        preload: resolve(__dirname, 'electron/preload.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (entryName === 'preload') {
          return format === 'cjs' ? `${entryName}.cjs` : `${entryName}.js`;
        }
        return format === 'es' ? `${entryName}.js` : `${entryName}.cjs`;
      },
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-store',
        'child_process',
        'fs',
        'path',
        'url',
        'os',
        'util',
        'crypto',
        'assert',
        /^node:.*/,
      ],
    },
  },
});
