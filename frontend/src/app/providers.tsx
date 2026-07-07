/**
 * @/app/providers — global providers wrapping the whole app (A9, ADR-0008).
 *   - QueryClientProvider (TanStack Query 5.x): server-state cache + loading/error + optimistic DnD.
 *   - AuthProvider (@/lib/auth): current user + login/logout.
 * A single QueryClient instance is created once for the app.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
