import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./src/test-setup.ts'],
    server: {
      deps: {
        // zod v4 exports `z` via `import * as z` re-export which Vite SSR
        // cannot resolve via named destructuring. Force inline bundling so
        // the namespace export is preserved correctly.
        inline: [/^zod/],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // zod v4 ESM re-exports `z` as a namespace binding that Vite SSR
      // cannot traverse. The CJS build does not have this issue.
      'zod': path.resolve(__dirname, 'node_modules/zod/index.cjs'),
    },
  },
});
