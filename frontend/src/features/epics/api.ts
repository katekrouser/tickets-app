/**
 * @/features/epics/api — server-state hooks for epic management (§5, §10).
 *
 * An epic belongs to exactly one team, chosen at creation and immutable thereafter
 * (updateEpic accepts only title/description). Reference detection (is any ticket
 * pointing at this epic?) drives the disabled delete control; the backend 409
 * (EPIC_REFERENCED) is the authoritative guard and is surfaced by callers.
 */
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@app/shared';
import { api } from '@/lib/api';

export type Team = components['schemas']['Team'];
export type Epic = components['schemas']['Epic'];
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

// Shared-by-prefix with the teams feature at runtime (single QueryClient): mutating an
// epic invalidates ['epics'], which also refreshes team reference state on the teams page.
const keys = {
  teams: ['teams'] as const,
  epics: (teamId?: string) => (teamId ? (['epics', teamId] as const) : (['epics'] as const)),
  ticketsByEpic: (teamId: string, epicId: string) =>
    ['tickets', 'epic', teamId, epicId] as const,
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

/** Epics, optionally filtered by team. */
export function useEpics(teamId?: string) {
  return useQuery({
    queryKey: keys.epics(teamId),
    queryFn: async (): Promise<Epic[]> => {
      const { data, error, response } = await api.GET('/epics', {
        params: { query: teamId ? { teamId } : {} },
      });
      if (error) throw toApiError(response, error);
      return data ?? [];
    },
  });
}

export function useCreateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      teamId: string;
      title: string;
      description: string | null;
    }): Promise<Epic> => {
      const { data, error, response } = await api.POST('/epics', {
        body: { teamId: vars.teamId, title: vars.title, description: vars.description },
      });
      if (error) throw toApiError(response, error);
      return data as Epic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics'] }),
  });
}

export function useUpdateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      epicId: string;
      title: string;
      description: string | null;
    }): Promise<Epic> => {
      const { data, error, response } = await api.PATCH('/epics/{epicId}', {
        params: { path: { epicId: vars.epicId } },
        body: { title: vars.title, description: vars.description },
      });
      if (error) throw toApiError(response, error);
      return data as Epic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics'] }),
  });
}

export function useDeleteEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (epicId: string): Promise<void> => {
      const { error, response } = await api.DELETE('/epics/{epicId}', {
        params: { path: { epicId } },
      });
      if (error) throw toApiError(response, error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epics'] }),
  });
}

export interface EpicReference {
  referenced: boolean;
  loading: boolean;
}

/** Determines, per epic, whether any ticket references it (delete must be disabled). */
export function useEpicReferences(epics: Epic[]): Record<string, EpicReference> {
  const queries = useQueries({
    queries: epics.map((e) => ({
      queryKey: keys.ticketsByEpic(e.teamId, e.id),
      queryFn: async (): Promise<Ticket[]> => {
        const { data, error, response } = await api.GET('/tickets', {
          params: { query: { teamId: e.teamId, epicId: e.id } },
        });
        if (error) throw toApiError(response, error);
        return data ?? [];
      },
    })),
  });

  const result: Record<string, EpicReference> = {};
  epics.forEach((e, i) => {
    const q = queries[i];
    result[e.id] = {
      referenced: (q?.data?.length ?? 0) > 0,
      loading: q?.isLoading ?? true,
    };
  });
  return result;
}
