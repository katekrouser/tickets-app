import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Backend test runner config (A14). Lives under backend/tests/** (A14-owned).
 *
 * A4 must point the backend `test` script at this file:
 *     "test": "vitest run --config tests/vitest.config.ts"
 * (flagged in docs/process/handoffs/A14.md).
 *
 * Resolves the two frozen import styles the backend source uses:
 *   1. Bare workspace-internal specifiers `backend/src/*` (tsconfig `paths`) →
 *      aliased here to `<backend>/src/*` so vitest resolves them as tsc does.
 *   2. Explicit `.js` specifiers on relative imports (NodeNext/ESM convention in
 *      the .ts sources) → a pre-resolve plugin strips `.js` so the sibling `.ts`
 *      is resolved.
 *
 * `@app/shared` resolves through the workspace node_modules symlink to its built
 * `dist`, so it needs no alias.
 */
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(backendRoot, 'src');

/** Resolve `./x.js` (TS/ESM convention) to the real `./x.ts` sibling for vitest. */
const stripTsJsExt = {
  name: 'strip-ts-js-ext',
  enforce: 'pre' as const,
  async resolveId(source: string, importer: string | undefined) {
    if (
      importer &&
      /\.[cm]?tsx?$/.test(importer) &&
      /^\.{1,2}\//.test(source) &&
      source.endsWith('.js')
    ) {
      const resolved = await (this as any).resolve(source.slice(0, -3), importer, {
        skipSelf: true,
      });
      return resolved ?? null;
    }
    return null;
  },
};

export default defineConfig({
  root: backendRoot,
  plugins: [stripTsJsExt],
  resolve: {
    alias: [{ find: /^backend\/src/, replacement: srcDir }],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Integration/DB suites self-skip when DATABASE_URL is absent (see tests/integration).
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
