/**
 * Board data layer (A12): TanStack Query hooks over the single typed client `@/lib/api`.
 *
 * - `useTeams` / `useTeamEpics` populate the team selector and the epic filter.
 * - `useBoardTickets` fetches ALL tickets for the selected team (server returns them
 *   most-recently-modified first). Filtering + title search are applied client-side
 *   (see `./filters`) so they stay instant and AND-combine without network churn — smooth
 *   at ≥100 tickets. This keeps ONE cache entry per team, which makes the optimistic
 *   drag-and-drop update below simple and correct.
 * - `useMoveTicket` persists a drag via `PATCH /tickets/{ticketId}` with an OPTIMISTIC cache
 *   update and rollback on failure (REQUIREMENTS §8). The caller shows the error toast.
 *
 * All domain data comes from the API (never localStorage) per REQUIREMENTS §9 / ADR-0009.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { components, TicketState } from '@app/shared';

export type Ticket = components['schemas']['Ticket'];
export type Team = components['schemas']['Team'];
export type Epic = components['schemas']['Epic'];

const KEYS = {
  teams: ['board', 'teams'] as const,
  epics: (teamId: string) => ['board', 'epics', teamId] as const,
  tickets: (teamId: string) => ['board', 'tickets', teamId] as const,
};

/** Normalize an openapi-fetch error envelope (`{ code, message }`) into an Error. */
function toError(err: unknown, fallback: string): Error {
  const e = err as { message?: string; code?: string } | undefined;
  return new Error(e?.message || fallback);
}

export function useTeams(): UseQueryResult<Team[], Error> {
  return useQuery({
    queryKey: KEYS.teams,
    queryFn: async () => {
      const { data, error } = await api.GET('/teams');
      if (error) throw toError(error, 'Failed to load teams.');
      return data ?? [];
    },
  });
}

export function useTeamEpics(teamId: string | undefined): UseQueryResult<Epic[], Error> {
  return useQuery({
    queryKey: KEYS.epics(teamId ?? ''),
    enabled: Boolean(teamId),
    queryFn: async () => {
      const { data, error } = await api.GET('/teams/{teamId}/epics', {
        params: { path: { teamId: teamId as string } },
      });
      if (error) throw toError(error, 'Failed to load epics.');
      return data ?? [];
    },
  });
}

export function useBoardTickets(teamId: string | undefined): UseQueryResult<Ticket[], Error> {
  return useQuery({
    queryKey: KEYS.tickets(teamId ?? ''),
    enabled: Boolean(teamId),
    queryFn: async () => {
      const { data, error } = await api.GET('/tickets', {
        params: { query: { teamId: teamId as string } },
      });
      if (error) throw toError(error, 'Failed to load the board.');
      return data ?? [];
    },
  });
}

export interface MoveTicketVars {
  ticketId: string;
  fromState: TicketState;
  toState: TicketState;
}

interface MoveContext {
  previous: Ticket[] | undefined;
}

/**
 * Persist a drag-and-drop state change with optimistic UI + rollback.
 * - onMutate: snapshot the team's cached tickets, then move the card to `toState` and bump its
 *   `modifiedAt` so it sorts to the top of the destination column immediately.
 * - onError: restore the snapshot (card returns to its previous column). Caller shows the toast.
 * - onSuccess: reconcile the single ticket with the server's authoritative response.
 */
export function useMoveTicket(teamId: string): UseMutationResult<
  Ticket | undefined,
  Error,
  MoveTicketVars,
  MoveContext
> {
  const queryClient = useQueryClient();
  const key = KEYS.tickets(teamId);

  return useMutation<Ticket | undefined, Error, MoveTicketVars, MoveContext>({
    mutationFn: async ({ ticketId, toState }) => {
      const { data, error } = await api.PATCH('/tickets/{ticketId}', {
        params: { path: { ticketId } },
        body: { state: toState },
      });
      if (error) throw toError(error, 'Could not move the ticket.');
      return data;
    },
    onMutate: async ({ ticketId, toState }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Ticket[]>(key);
      const now = new Date().toISOString();
      queryClient.setQueryData<Ticket[]>(key, (old) =>
        old
          ? old.map((t) => (t.id === ticketId ? { ...t, state: toState, modifiedAt: now } : t))
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Ticket[]>(key, context.previous);
      }
    },
    onSuccess: (updated) => {
      if (!updated) return;
      queryClient.setQueryData<Ticket[]>(key, (old) =>
        old ? old.map((t) => (t.id === updated.id ? updated : t)) : old,
      );
    },
  });
}
