#!/usr/bin/env node
/**
 * build.mjs — compile @app/shared to dist/ as Node-ESM (NodeNext) with explicit
 * `.js` specifiers + declaration files, so production `node dist/server.js` can
 * load `@app/shared` without tsx/Vite.
 *
 * Steps:
 *   1. tsc -p tsconfig.build.json  -> dist/index.js, dist/index.d.ts, dist/schemas.js, dist/schemas.d.ts
 *   2. copy src/openapi.d.ts -> dist/openapi.d.ts  (tsc does not emit .d.ts inputs to outDir;
 *      the generated OpenAPI types are declaration-only and have no runtime counterpart, so the
 *      value bundle never imports them — but the built type surface `paths/components/operations`
 *      must still resolve for consumers, per ADR-0006).
 *
 * The export surface is unchanged (ADR-0006 frozen); this only changes packaging.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

// 1) Compile with the local TypeScript compiler.
const tscBin = resolve(
  pkgRoot,
  process.platform === 'win32' ? 'node_modules/.bin/tsc.cmd' : 'node_modules/.bin/tsc',
);
const tsc = existsSync(tscBin) ? tscBin : 'tsc'; // fall back to workspace-hoisted bin on PATH
const res = spawnSync(tsc, ['-p', resolve(pkgRoot, 'tsconfig.build.json')], {
  stdio: 'inherit',
  cwd: pkgRoot,
  shell: process.platform === 'win32',
});
if (res.status !== 0) {
  console.error('[build] tsc failed');
  process.exit(res.status ?? 1);
}

// 2) Copy the declaration-only OpenAPI types into dist so the type surface resolves.
const distDir = resolve(pkgRoot, 'dist');
mkdirSync(distDir, { recursive: true });
copyFileSync(resolve(pkgRoot, 'src/openapi.d.ts'), resolve(distDir, 'openapi.d.ts'));

console.log('[build] wrote dist/ (index.js, schemas.js, *.d.ts, openapi.d.ts)');
