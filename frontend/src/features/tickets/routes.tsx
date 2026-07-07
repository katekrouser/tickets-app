/**
 * @/features/tickets/routes — route-registry contribution + cross-feature route constants (ADR-0008).
 *
 * 1. `routes: RouteObject[]` — auto-discovered by @/app/router's import.meta.glob and composed as
 *    children of <AppShell>. All ticket screens are protected via <RequireAuth>.
 * 2. `ticketRoutes` — the FROZEN cross-feature navigation contract (A12 board imports it).
 */
import type { RouteObject } from 'react-router-dom';
import { RequireAuth } from '@/lib/auth';
import { TicketDetailPage } from './TicketDetailPage';

export { ticketRoutes } from './paths';

export const routes: RouteObject[] = [
  {
    path: '/tickets/new',
    element: (
      <RequireAuth>
        <TicketDetailPage mode="create" />
      </RequireAuth>
    ),
  },
  {
    path: '/tickets/:ticketId',
    element: (
      <RequireAuth>
        <TicketDetailPage mode="view" />
      </RequireAuth>
    ),
  },
  {
    path: '/tickets/:ticketId/edit',
    element: (
      <RequireAuth>
        <TicketDetailPage mode="edit" />
      </RequireAuth>
    ),
  },
];
