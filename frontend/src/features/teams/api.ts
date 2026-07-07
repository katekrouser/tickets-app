/**
 * @/features/teams/api — server-state hooks for team management (§4, §10).
 *
 * Uses the single foundation API client (@/lib/api) and the app-wide TanStack Query
 * cache. Reference detection (does a team still contain epics or tickets?) is derived
 * from the API — there is no count field on Team — and is the basis for disabling the
 * delete control. The authoritative guard is still the backend 409 (surfaced by callers).
 */
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@app/shared';
import { api } from '@/lib/api';

export type Team = components['schemas']['Team'];
type Epic = components['schemas']['Epic'];
type Ticket = components['schemas']['Ticket'];

/** Error carrying the HTTP status + machine code so callers can surface 409s clearly. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function toApiError(response: Response, error: unknown): ApiError {
  const body = (error ?? {}) as { code?: string; message?: string };
  return new ApiError(
    response.status,
    body.code,
    body.message ?? `Request failed (${response.status}).`,
  );
}

// Query keys are shared by prefix with the epics feature at runtime (single QueryClient),
// so creating/deleting an epic there refreshes team reference state here.
const keys = {
  teams: ['teams'] as const,
  epicsAll: ['epics'] as const,
  ticketsByTeam: (teamId: string) => ['tickets', 'team', teamId] as const,
};

export function useTeams() {
  return useQuery({
    queryKey: keys.teams,
    queryFn: async (): Promise<Team[]> => {
      const { data, error, response } = await api.GET('/teams');
      if (error) throw toApiError(response, error);
      return data ?? [];
    },
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Team> => {
      const { data, error, response } = await api.POST('/teams', { body: { name } });
      if (error) throw toApiError(response, error);
      return data as Team;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.teams }),
  });
}

export function useRenameTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { teamId: string; name: string }): Promise<Team> => {
      const { data, error, response } = await api.PATCH('/teams/{teamId}', {
        params: { path: { teamId: vars.teamId } },
        body: { name: vars.name },
      });
      if (error) throw toApiError(response, error);
      return data as Team;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.teams }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string): Promise<void> => {
      const { error, response } = await api.DELETE('/teams/{teamId}', {
        params: { path: { teamId } },
      });
      if (error) throw toApiError(response, error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.teams }),
  });
}

export interface TeamReference {
  /** True once we know the team still has epics or tickets (delete must be disabled). */
  referenced: boolean;
  /** True while reference state is still loading (delete disabled defensively). */
  loading: boolean;
}

/**
 * Determines, per team, whether it still contains epics or tickets. Fetches the full
 * epic list once and the ticket list per team (listTickets requires a teamId).
 */
export function useTeamReferences(teams: Team[]): Record<string, TeamReference> {
  const epicsQuery = useQuery({
    queryKey: keys.epicsAll,
    queryFn: async (): Promise<Epic[]> => {
      const { data, error, response } = await api.GET('/epics');
      if (error) throw toApiError(response, error);
      return data ?? [];
    },
  });

  const ticketQueries = useQueries({
    queries: teams.map((t) => ({
      queryKey: keys.ticketsByTeam(t.id),
      queryFn: async (): Promise<Ticket[]> => {
        const { data, error, response } = await api.GET('/tickets', {
          params: { query: { teamId: t.id } },
        });
        if (error) throw toApiError(response, error);
        return data ?? [];
      },
    })),
  });

  const epicsByTeam = new Set((epicsQuery.data ?? []).map((e) => e.teamId));

  const result: Record<string, TeamReference> = {};
  teams.forEach((t, i) => {
    const ticketsQ = ticketQueries[i];
    const loading = epicsQuery.isLoading || (ticketsQ?.isLoading ?? true);
    const hasTickets = (ticketsQ?.data?.length ?? 0) > 0;
    const referenced = epicsByTeam.has(t.id) || hasTickets;
    result[t.id] = { referenced, loading };
  });
  return result;
}
