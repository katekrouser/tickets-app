/**
 * @/features/teams/routes — route-registry contribution (ADR-0008).
 * Auto-discovered by @/app/router via import.meta.glob; no edit to @/app required.
 */
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '@/lib/auth';
import { TeamsPage } from './TeamsPage';

export const routes: RouteObject[] = [
  {
    path: '/teams',
    element: (
      <RequireAuth>
        <TeamsPage />
      </RequireAuth>
    ),
  },
];
