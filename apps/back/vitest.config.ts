import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The tests read the source of @repo/shared, so they need no build of the package.
const sharedSource = fileURLToPath(
  new URL('../../packages/shared/src/index.ts', import.meta.url),
);

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: {
    tsconfigPaths: true,
    alias: { '@repo/shared': sharedSource },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
