/**
 * @/app/router — route composition via the route-registry pattern (ADR-0008).
 *
 * Each feature module (A10–A13) exports `routes: RouteObject[]` from `@/features/<name>/routes.tsx`.
 * They are AUTO-DISCOVERED here with Vite's `import.meta.glob`, so a feature registers its screens
 * simply by creating `src/features/<name>/routes.tsx` — WITHOUT editing anything in `@/app`
 * (ADR-0008 route-registry; charter acceptance criterion).
 *
 * Landing route (`/`): authenticated users are redirected to `/board`; unauthenticated users hit
 * RequireAuth first and are sent to `/login`. Unknown paths fall through to NotFound. Public auth
 * routes (`/login`, `/signup`, …) come from A10's feature and are picked up automatically by the glob.
 *
 * With zero features the glob resolves to `{}` and `featureRoutes` is empty; the router still composes
 * and runs (the `/board` and `/login` targets simply arrive once their features register).
 */
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  type RouteObject,
} from 'react-router-dom';
import { AppShell } from '@/app/shell';
import { RequireAuth } from '@/lib/auth';
import { EmptyState } from '@/components';

// Route-registry: auto-discover every feature's exported `routes` (ADR-0008). Zero features → {}.
const featureRouteModules = import.meta.glob<RouteObject[]>('../features/*/routes.tsx', {
  eager: true,
  import: 'routes',
});
const featureRoutes: RouteObject[] = Object.values(featureRouteModules).flat();

function NotFound(): JSX.Element {
  return <EmptyState message="Page not found." />;
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        // Landing route: authenticated users go to the board; unauthenticated users are sent to
        // /login by RequireAuth (the guard wraps the redirect so it does not depend on /board's guard).
        index: true,
        element: (
          <RequireAuth>
            <Navigate to="/board" replace />
          </RequireAuth>
        ),
      },
      // Feature-contributed routes compose here (route-registry, ADR-0008).
      ...featureRoutes,
      { path: '*', element: <NotFound /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export function AppRouter(): JSX.Element {
  return <RouterProvider router={router} />;
}
