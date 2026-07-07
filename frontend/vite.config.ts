/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vite config — realizes the ADR-0009 API transport contract on the FE dev server.
 *
 * Transport (ADR-0009 §4, §9, §10, §16):
 *   - The FE always calls the relative base path `/api` (see @/lib/api `baseUrl: '/api'`).
 *   - The dev server proxies `/api` → exactly `http://localhost:3000` (the single target that
 *     serves BOTH the real backend and the Prism mock during development).
 *
 * Path handling — real backend vs. Prism mock (A1 handoff advisory):
 *   - REAL BACKEND (default): the backend serves under `/api/*`, so the path is PRESERVED
 *     (no rewrite). `/api/teams` → `http://localhost:3000/api/teams`.
 *   - PRISM MOCK (`VITE_USE_MOCK=1`): Prism 5 ignores the OpenAPI `servers` base path and serves
 *     operations at ROOT (`/teams`, not `/api/teams`). So when developing against the mock we strip
 *     the leading `/api`. `/api/teams` → `http://localhost:3000/teams`.
 *
 * The default is real-backend (path preserved). Set `VITE_USE_MOCK=1` (or `true`) to target Prism.
 */
export default defineConfig(() => {
  const useMock =
    process.env.VITE_USE_MOCK === '1' || process.env.VITE_USE_MOCK === 'true';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          // Real backend: path preserved. Prism mock: strip the leading `/api`.
          ...(useMock ? { rewrite: (p: string) => p.replace(/^\/api/, '') } : {}),
        },
      },
    },
    // Vitest (TDR v2): jsdom DOM environment so component/XSS render suites have a
    // real DOM. Build/CI only — not part of the runtime image. Transport/proxy above
    // (ADR-0009) is unchanged.
    test: {
      environment: 'jsdom',
    },
  };
});
