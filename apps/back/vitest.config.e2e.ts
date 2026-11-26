import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The tests read the source of @repo/shared, so they need no build of the package.
const sharedSource = fileURLToPath(
  new URL('../../packages/shared/src/index.ts', import.meta.url),
);

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { '@repo/shared': sharedSource },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
