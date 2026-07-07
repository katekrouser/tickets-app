/**
 * Board feature route registration (A12, ADR-0008 route-registry).
 *
 * `@/app/router` auto-discovers this `routes` export via `import.meta.glob('../features/*\/routes.tsx')`
 * and composes it under the shared <AppShell>. The board is a protected screen, so its element is
 * wrapped in <RequireAuth>. This file edits nothing in `@/app`.
 */
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '@/lib/auth';
import { BoardPage } from './BoardPage';

export const routes: RouteObject[] = [
  {
    path: '/board',
    element: (
      <RequireAuth>
        <BoardPage />
      </RequireAuth>
    ),
  },
];
